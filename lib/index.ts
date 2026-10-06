'use strict'

const TOKEN_SEPARATOR = ':'
const REGEX_CHAR = '*'
const RANGE_CHAR = '~'
const NEGATED_PREFIX = 'not'
const SPECIAL_MATCH_PREFIX = 'is'
const SPECIAL_NOT_MATCH_PREFIX = `${SPECIAL_MATCH_PREFIX} ${NEGATED_PREFIX}`
const SPECIAL_MATCH_VALUES = ['true', 'false', 'undef', 'undefined', 'null', 'blank', 'empty']
const GROUP_START = '('
const GROUP_END = ')'
const VAL_TOKEN = '"'
const EMPTY_VAL_GROUP = `${VAL_TOKEN}${VAL_TOKEN}`
const KEY_SEPARATOR = '.'
const RANGE_REGEXP = /^[^-\d]*(-?\d+(\.\d+)?)?[^-\d]*-[^-\d]*(-?\d+(\.\d+)?)?[^-\d]*$/
const TOKENIZER = new RegExp(` *(${NEGATED_PREFIX})? *(\\${GROUP_START})| *(${NEGATED_PREFIX} +)?(?:((?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\${REGEX_CHAR}${RANGE_CHAR}${VAL_TOKEN}${TOKEN_SEPARATOR}])+) *(${SPECIAL_MATCH_PREFIX}|${SPECIAL_NOT_MATCH_PREFIX}|[${REGEX_CHAR}${RANGE_CHAR}]?${TOKEN_SEPARATOR}))? *(${VAL_TOKEN}((?:\\\\.|[^${VAL_TOKEN}\\\\])+)${VAL_TOKEN}?|(?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\])+)? *(and|or|\\${GROUP_END}|$)`, 'g')
const TOKEN = { GROUP_NEGATED: 1, GROUP_START: 2, NEGATED: 3, KEY: 4, TYPE: 5, VALUE: 6, QUOTED_VALUE: 7, OPERATOR: 8 }
const UNKNOWN = -1
const EMPTY_STR = ''
const STRING = 'string'
const NUMBER = 'number'
const BIGINT = 'bigint'
const OBJECT = 'object'
const NO_MATCH = 0
const FULL_MATCH = 1
const DEFAULT_FUZZY_ALGORITHM: FuzzyAlgorithm = 'damerau'
const DEFAULT_FUZZY_TOLERANCE = 0.25
const DEFAULT_FUZZY_MIN_LENGTH = 3

enum QueryType {
    PARTIAL = 1,
    RANGE = 2,
    REGEX = 3,
    IS = 4,
}

interface Query {
    key: any
    value: any
    type: QueryType
    operator?: Operator
    negated?: boolean
}

interface Range {
    min?: number
    max?: number
}

class GroupQuery {
    conditions: (Query | GroupQuery)[]
    negated?: boolean
    operator?: Operator

    constructor() {
        this.conditions = []
        this.operator = void 0
    }

    lastCondition(): Query | GroupQuery {
        return this.conditions[this.conditions.length - 1]
    }
}

enum Operator { AND = 'and', OR = 'or' }

namespace Operator {
    export function from(operator: string): Operator {
        switch (operator) {
            case Operator.OR: return Operator.OR
            default: return Operator.AND
        }
    }
}

interface SearchOptions {
    /** Array of keys to exclude from search. */
    excludeKeys?: string[],
    /** Whether to consider numeric strings in the range search. 
     * Disabling improves range search performance. 
     * 
     * Default is true.  */
    allowNumericString?: boolean
    /** Whether to match keys and values when no quotes are used in the query and no value is provided. 
     * Disabling improves key search performance. 
     * 
     * Default is true.
     * @example 
     * The query "foo" (no quotes), will match "foo: anyValue" and "anyField: foo".
     * The query "foo:bar" has a value and will not be affected by this option.
     */
    allowKeyValueMatching?: boolean
    /** If true, once the key is found, child object keys will be considered as possible values. 
     * Disabling improves value search performance. 
     * 
     * Default is false.
     * @example
     * If true, "foo:bar" => [{ foo: 'bar' }, { foo: { bar: 'dummy' } }]
     * Else, "foo:bar" => [{ foo: 'bar' }]
     */
    matchChildKeysAsValues?: boolean,
    /** Maximum levels of nested objects to search through.
     * Disabling allows searching through all levels but may impact performance and cause infinite loop in case of circular references.
     * Default is unlimited levels.
     */
    maxLevels?: number
    /** Enables typo-tolerant matching of string values. Use `true` for the defaults or an object to customize.
     * Only plain value matches are affected. Keys, numbers, regex, range and "is" queries are always exact.
     * 
     * Default is false (disabled).
     * @example
     * { fuzzy: true } => "name: jhon" matches { name: 'John' }
     */
    fuzzy?: boolean | FuzzyOptions
}

/**
 * - `damerau`: edit distance where insertions, deletions, substitutions and swapped adjacent characters count as 1 edit.
 * - `levenshtein`: edit distance where insertions, deletions and substitutions count as 1 edit.
 * - `subsequence`: the term characters must appear in order, gaps allowed (e.g. "jsmth" matches "John Smith").
 */
type FuzzyAlgorithm = 'damerau' | 'levenshtein' | 'subsequence'

interface FuzzyOptions {
    /** Algorithm used to compare the term with the values.
     * 
     * Default is 'damerau'.
     */
    algorithm?: FuzzyAlgorithm
    /** Fraction (0 to 1) of the term length that can be edited. Ignored by `subsequence`.
     * 
     * Default is 0.25 (e.g. 1 edit for terms with 4 to 7 characters).
     */
    tolerance?: number
    /** Maximum number of edits allowed regardless of the term length. Ignored by `subsequence`.
     * 
     * Default is unlimited.
     */
    maxDistance?: number
    /** Terms shorter than this are matched exactly.
     * 
     * Default is 3.
     */
    minLength?: number
    /** Whether to sort the results by relevance (closest matches first). Ties keep the original order.
     * 
     * Default is false.
     */
    sort?: boolean
}

interface ResolvedFuzzyOptions {
    algorithm: FuzzyAlgorithm
    tolerance: number
    maxDistance: number
    minLength: number
    sort: boolean
}

interface EngineOptions extends Omit<SearchOptions, 'fuzzy'> {
    fuzzy?: ResolvedFuzzyOptions
    /** Score at which the traversal stops looking for better matches. */
    stopScore: number
}

/**
 * SearchEngine class provides methods to search through an array of objects using a query syntax.
 * The query syntax allows for complex searches including conditions, negations, and grouping.
 */
class SearchEngine {
    private options: SearchOptions

    /**
     * Creates a new instance of SearchEngine with the specified options.
     * @param options - Search options
     */
    constructor(options: SearchOptions = {}) {
        this.options = options
    }

    /**
     * Search through an array of objects using the query syntax.
     * 
     * @param objList - Array of objects to search
     * @param queryStr - Query string (e.g. "name:john and age~:20-30")
     * @returns Array of matched objects
     */
    search<T extends Record<string, any>>(objList: T[], queryStr: string): T[] {
        return SearchEngine.search(objList, queryStr, this.options)
    }

    /**
     * Search through an array of objects using the query syntax.
     * 
     * @param objList - Array of objects to search
     * @param queryStr - Query string (e.g. "name:john and age~:20-30")
     * @param options - Search options
     * @returns Array of matched objects
     */
    static search<T extends Record<string, any>>(objList: T[], queryStr: string, options: SearchOptions = {}): T[] {
        if (!objList) { return [] }
        if (!queryStr || queryStr.trim() === EMPTY_STR) { return objList.slice() }
        const engineOptions = resolveOptions(options)
        const group = extractConditionsFromQuery(queryStr.toLowerCase())
        const results = [...evaluateGroup(new Set(objList), group, engineOptions)]
        return engineOptions.fuzzy && engineOptions.fuzzy.sort ? sortByRelevance(results, group, engineOptions) : results
    }
}

function resolveOptions(options: SearchOptions): EngineOptions {
    return {
        excludeKeys: options.excludeKeys,
        allowNumericString: options.allowNumericString === void 0 ? true : options.allowNumericString,
        allowKeyValueMatching: options.allowKeyValueMatching === void 0 ? true : options.allowKeyValueMatching,
        matchChildKeysAsValues: options.matchChildKeysAsValues,
        maxLevels: options.maxLevels,
        fuzzy: resolveFuzzyOptions(options.fuzzy),
        stopScore: Number.MIN_VALUE
    }
}

function resolveFuzzyOptions(fuzzy?: boolean | FuzzyOptions): ResolvedFuzzyOptions | undefined {
    if (!fuzzy) { return void 0 }
    const opts: FuzzyOptions = fuzzy === true ? {} : fuzzy
    return {
        algorithm: opts.algorithm === 'levenshtein' || opts.algorithm === 'subsequence' ? opts.algorithm : DEFAULT_FUZZY_ALGORITHM,
        tolerance: opts.tolerance === void 0 ? DEFAULT_FUZZY_TOLERANCE : Math.min(Math.max(opts.tolerance, 0), 1),
        maxDistance: opts.maxDistance === void 0 ? Infinity : Math.max(Math.floor(opts.maxDistance), 0),
        minLength: opts.minLength === void 0 ? DEFAULT_FUZZY_MIN_LENGTH : opts.minLength,
        sort: !!opts.sort
    }
}

function evaluateGroup<T>(objList: Set<T>, group: GroupQuery, options: EngineOptions): Set<T> {
    if (group.conditions.length === 0) { return group.negated ? new Set() : objList }
    
    let currentResults = evaluateCondition(objList, group.conditions[0], options)
    
    for (let i = 1; i < group.conditions.length; i++) {
        const condition = group.conditions[i]
        const previousOperator = group.conditions[i - 1].operator
        
        if (previousOperator && previousOperator === Operator.OR) {
            const nextResults = evaluateCondition(objList, condition, options)
            for (const item of nextResults) { currentResults.add(item) }
        } else {
            currentResults = evaluateCondition(currentResults, condition, options)
        }
    }
    
    if (!group.negated) { return currentResults }

    // If the group is negated, return everything except the group results
    const negatedResult = new Set<T>()
    for (const obj of objList) { currentResults.has(obj) || negatedResult.add(obj) }
    return negatedResult
}

function evaluateCondition<T>(objList: Set<T>, condition: Query | GroupQuery, options: EngineOptions): Set<T> {
    if ('conditions' in condition) { return evaluateGroup(objList, condition, options) }
    
    const resultSet = new Set<T>()
    for (const obj of objList) {
        if (condition.negated !== (findQuery(obj, condition, EMPTY_STR, options, 1) > NO_MATCH)) {
            resultSet.add(obj)
        }
    }
    return resultSet
}

function sortByRelevance<T>(results: T[], group: GroupQuery, options: EngineOptions): T[] {
    const scoreOptions: EngineOptions = Object.assign({}, options, { stopScore: FULL_MATCH })
    return results
        .map(item => ({ item, score: scoreGroup(item, group, false, scoreOptions) }))
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item)
}

/** Sums the best score of every condition that is not negated (considering the negation of the parent groups). */
function scoreGroup(obj: any, group: GroupQuery, negated: boolean, options: EngineOptions): number {
    negated = negated !== !!group.negated
    let score = NO_MATCH
    for (const condition of group.conditions) {
        if ('conditions' in condition) {
            score += scoreGroup(obj, condition, negated, options)
        } else if (negated === !!condition.negated) {
            score += findQuery(obj, condition, EMPTY_STR, options, 1)
        }
    }
    return score
}

/** Returns the best score found, stopping as soon as it reaches `options.stopScore`. */
function findQuery(obj: any, query: Query, nestedKeys: string, options: EngineOptions, level: number, keyFound?: boolean): number {
    if (obj === null || obj === void 0 || typeof obj !== OBJECT) { return NO_MATCH }
    const keys = Object.keys(obj)

    obj.length !== void 0 && keys.push('length')

    let best = NO_MATCH
    let score: number
    nestedKeys += KEY_SEPARATOR
    for (const key of keys) {
        const newNestedKeys = nestedKeys + key.toLowerCase()

        if (isExcluded(newNestedKeys, options.excludeKeys)) { continue }

        if (keyFound === void 0) {
            if (newNestedKeys.indexOf(query.key) === UNKNOWN) {
                if ((score = findQuery(obj[key], query, newNestedKeys, options, level + 1)) > best && (best = score) >= options.stopScore) { return best }
                if (options.allowKeyValueMatching && query.value === void 0 &&
                    (score = match(query.key, obj[key], query.type, options)) > best && (best = score) >= options.stopScore) { return best }
                continue
            }

            if (query.value === void 0) { return FULL_MATCH }
        }

        if ((score = match(query.value, obj[key], query.type, options)) > best && (best = score) >= options.stopScore) { return best }
        if ((score = findQuery(obj[key], query, newNestedKeys, options, level + 1, true)) > best && (best = score) >= options.stopScore) { return best }
    }
    return best
}

function extractConditionsFromQuery(query: string, regex = new RegExp(TOKENIZER), group = new GroupQuery()): GroupQuery {
    let m: RegExpExecArray | null
    while ((m = regex.exec(query)) !== null && m[0] !== EMPTY_STR) {                
        if (m[TOKEN.GROUP_START]) {
            const subGroup = extractConditionsFromQuery(query, regex)
            subGroup.negated = !!m[TOKEN.GROUP_NEGATED]
            group.conditions.push(subGroup)
            continue
        }

        let key: string | undefined = m[TOKEN.KEY]
        let value: string | undefined = m[TOKEN.QUOTED_VALUE] || void 0

        if (key === void 0) {
            key = value !== void 0 ? KEY_SEPARATOR : getUnquotedValue(m[TOKEN.VALUE])
        } else if (value === void 0) {
            value = getUnquotedValue(m[TOKEN.VALUE])
        }

        if (key || value) {
            group.conditions.push(getQuery(!!m[TOKEN.NEGATED], m[TOKEN.TYPE], key, value))
        }

        if (m[TOKEN.OPERATOR] === GROUP_END) { break }
        if (m[TOKEN.OPERATOR]) { group.lastCondition()!.operator = Operator.from(m[TOKEN.OPERATOR]) }
    }

    return group
}

function getQuery(negated: boolean, type?: string, key?: string, value?: string): Query {

    const query: Query = { negated, key: removeEscapeChar(key), type: QueryType.PARTIAL, value: removeEscapeChar(value) }

    if (!type || type === TOKEN_SEPARATOR) { return query }
    
    if (!query.value || query.value.trim() === EMPTY_STR) {
        delete query.value
        return query
    }

    if (type[0] === REGEX_CHAR) {
        try {
            query.value = new RegExp(query.value, 'i')
            query.type = QueryType.REGEX
        } catch (_e) {
            delete query.value
        }
        return query
    }
    
    if (type[0] === RANGE_CHAR) {
        const matches = query.value.match(RANGE_REGEXP)
        if (!matches) {
            delete query.value
            return query
        }

        query.value = { min: parseFloat(matches[1]), max: parseFloat(matches[3]) }
        !query.value.min && query.value.min !== 0 && delete query.value.min
        !query.value.max && query.value.max !== 0 && delete query.value.max

        if (query.value.min === void 0 && query.value.max === void 0) {
            delete query.value
        } else {
            query.type = QueryType.RANGE
        }
        return query
    }

    if (type.toLowerCase() === SPECIAL_NOT_MATCH_PREFIX) { query.negated = !query.negated }
    if (SPECIAL_MATCH_VALUES.includes(query.value)) {
        query.type = QueryType.IS
    }

    return query
}

function match(expectedValue: any, value: any, type: QueryType, options: EngineOptions): number {   
    const typeOf = value === null || value === void 0 ? STRING : typeof value

    if (typeOf === OBJECT) {
        if (Array.isArray(value)) {
            if (type === QueryType.IS && expectedValue === 'empty' && value.length === 0) { return FULL_MATCH }
            return NO_MATCH
        }

        let best = NO_MATCH
        if (options.matchChildKeysAsValues) {
            for (const v of Object.keys(value)) {
                const score = match(expectedValue, v, type, options)
                if (score > best && (best = score) >= options.stopScore) { return best }
            }
        }
        return best
    }

    if (type === QueryType.RANGE) {
        if (typeOf !== NUMBER && typeOf !== BIGINT && !(options.allowNumericString && typeOf === STRING && !isNaN(value = +value))) { return NO_MATCH }
        return matchRange(expectedValue as Range, value) ? FULL_MATCH : NO_MATCH
    }
    
    if (type === QueryType.REGEX) { return (expectedValue as RegExp).test(value) ? FULL_MATCH : NO_MATCH }

    if (type === QueryType.IS) {
        switch (expectedValue) {
            case 'true': return value === true ? FULL_MATCH : NO_MATCH
            case 'false': return value === false ? FULL_MATCH : NO_MATCH
            case 'undef':
            case 'undefined': return value === void 0 ? FULL_MATCH : NO_MATCH
            case 'null': return value === null ? FULL_MATCH : NO_MATCH
            case 'blank': return value === EMPTY_STR ? FULL_MATCH : NO_MATCH
            default: return NO_MATCH
        }
    }

    if (typeOf === STRING) {
        const str = `${value}`.toLowerCase()
        if (str.indexOf(expectedValue) !== UNKNOWN) { return FULL_MATCH }
        return options.fuzzy && value !== null && value !== void 0 ? fuzzyMatch(expectedValue, str, options.fuzzy) : NO_MATCH
    }

    if (typeOf === NUMBER || typeOf === BIGINT) {
        return `${value}`.indexOf(expectedValue) !== UNKNOWN ? FULL_MATCH : NO_MATCH
    }

    return NO_MATCH
}

/** Returns a score between 0 (no match) and 1 (exact match) for the term inside the text. */
function fuzzyMatch(term: string, text: string, fuzzy: ResolvedFuzzyOptions): number {
    if (term.length < fuzzy.minLength) { return NO_MATCH }

    if (fuzzy.algorithm === 'subsequence') { return subsequenceScore(term, text) }

    const maxDistance = Math.min(fuzzy.maxDistance, Math.floor(term.length * fuzzy.tolerance))
    if (maxDistance === 0) { return NO_MATCH }

    const distance = substringEditDistance(term, text, maxDistance, fuzzy.algorithm === 'damerau')
    return distance > maxDistance ? NO_MATCH : FULL_MATCH - distance / (term.length + 1)
}

/**
 * Smallest edit distance between the term and any substring of the text (Sellers' algorithm).
 * Returns any value greater than `maxDistance` when no substring is within the limit.
 * When `transpositions` is true, swapping two adjacent characters counts as a single edit (optimal string alignment).
 */
function substringEditDistance(term: string, text: string, maxDistance: number, transpositions: boolean): number {
    const m = term.length
    if (text.length < m - maxDistance) { return maxDistance + 1 }

    let prev2 = new Array<number>(m + 1)
    let prev = new Array<number>(m + 1)
    let curr = new Array<number>(m + 1)
    for (let i = 0; i <= m; i++) { prev[i] = i }

    let best = prev[m]
    for (let j = 1; j <= text.length; j++) {
        const textChar = text.charCodeAt(j - 1)
        curr[0] = 0
        for (let i = 1; i <= m; i++) {
            const termChar = term.charCodeAt(i - 1)
            let cost = prev[i - 1] + (termChar === textChar ? 0 : 1)
            if (prev[i] + 1 < cost) { cost = prev[i] + 1 }
            if (curr[i - 1] + 1 < cost) { cost = curr[i - 1] + 1 }
            if (transpositions && i > 1 && j > 1 && termChar === text.charCodeAt(j - 2) && term.charCodeAt(i - 2) === textChar && prev2[i - 2] + 1 < cost) {
                cost = prev2[i - 2] + 1
            }
            curr[i] = cost
        }
        if (curr[m] < best && (best = curr[m]) === 0) { return 0 }

        const recycled = prev2
        prev2 = prev
        prev = curr
        curr = recycled
    }
    return best
}

/** Scores the tightest window of the text containing all term characters in order (1 when contiguous). */
function subsequenceScore(term: string, text: string): number {
    const m = term.length
    let best = NO_MATCH
    let start = text.indexOf(term[0])
    while (start !== UNKNOWN && text.length - start >= m) {
        let end = start
        for (let i = 1; i < m && end !== UNKNOWN; i++) { end = text.indexOf(term[i], end + 1) }
        if (end === UNKNOWN) { break }

        // Walk backwards from the end to find the tightest start for this end
        let tightStart = end
        for (let i = m - 2; i >= 0; i--) { tightStart = text.lastIndexOf(term[i], tightStart - 1) }

        const score = m / (end - tightStart + 1)
        if (score > best && (best = score) === FULL_MATCH) { break }
        start = text.indexOf(term[0], tightStart + 1)
    }
    return best
}

function matchRange(expectedRange: Range, numValue: number): boolean {
    if (expectedRange.min !== void 0 && expectedRange.max !== void 0) {
        return numValue >= expectedRange.min && numValue <= expectedRange.max
    } 
    if (expectedRange.min !== void 0) { return numValue >= expectedRange.min }
    return numValue <= expectedRange.max!
}

function isExcluded(nestedKeys: string, excludedKeys?: string[]): boolean {
    if (excludedKeys) {
        for (const key of excludedKeys) { if (nestedKeys.endsWith(key)) { return true } }
    }
    return false
}

function removeEscapeChar(str?: string): string | undefined {    
    return str ? str.replace(/\\(.)/g, '$1') : str
}

function getUnquotedValue(value: string): string | undefined {
    return value !== EMPTY_VAL_GROUP && value !== VAL_TOKEN ? value : void 0
}

export default SearchEngine

// @ts-ignore module exists in CommonJS environments
module && (module.exports = SearchEngine)