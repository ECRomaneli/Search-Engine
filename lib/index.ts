'use strict'

const TOKEN_SEPARATOR = ':'
const REGEX_CHAR = '*'
const RANGE_CHAR = '~'
const GROUP_START = '('
const GROUP_END = ')'
const VAL_TOKEN = '"'
const EMPTY_VAL_GROUP = `${VAL_TOKEN}${VAL_TOKEN}`
const KEY_SEPARATOR = '.'
const NEGATED_PREFIX = 'not'
const RANGE_REGEXP = /^[^-\d]*(-?\d+(\.\d+)?)?[^-\d]*-[^-\d]*(-?\d+(\.\d+)?)?[^-\d]*$/
const TOKENIZER = new RegExp(` *(${NEGATED_PREFIX})? *(\\${GROUP_START})| *(${NEGATED_PREFIX} +)?(?:((?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\${REGEX_CHAR}${RANGE_CHAR}${TOKEN_SEPARATOR}])+) *([${REGEX_CHAR}${RANGE_CHAR}]?${TOKEN_SEPARATOR}))? *(${VAL_TOKEN}((?:\\\\.|[^${VAL_TOKEN}\\\\])+)${VAL_TOKEN}?|(?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\])+)? *(and|or|\\${GROUP_END}|$)`, 'g')
const TOKEN = { GROUP_NEGATED: 1, GROUP_START: 2, NEGATED: 3, KEY: 4, TYPE: 5, VALUE: 6, QUOTED_VALUE: 7, OPERATOR: 8 }
const UNKNOWN = -1
const EMPTY_STR = ''
const STRING = 'string'
const NUMBER = 'number'
const BOOLEAN = 'boolean'
const BIGINT = 'bigint'
const OBJECT = 'object'

interface Query {
    key: any
    value: any
    type?: string
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
    matchChildKeysAsValues?: boolean
}

/**
 * SearchEngine class provides methods to search through an array of objects using a query syntax.
 * The query syntax allows for complex searches including conditions, negations, and grouping.
 */
class SearchEngine {
    #options: SearchOptions

    /**
     * Creates a new instance of SearchEngine with the specified options.
     * @param options - Search options
     */
    constructor(options: SearchOptions = {}) {
        this.#options = options
    }

    /**
     * Search through an array of objects using the query syntax.
     * 
     * @param objList - Array of objects to search
     * @param queryStr - Query string (e.g. "name:john and age~:20-30")
     * @returns Array of matched objects
     */
    search<T extends Record<string, any>>(objList: T[], queryStr: string): T[] {
        return SearchEngine.search(objList, queryStr, this.#options)
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
        options.allowNumericString === void 0 && (options.allowNumericString = true)
        options.allowKeyValueMatching === void 0 && (options.allowKeyValueMatching = true)
        return [...evaluateGroup(new Set(objList), extractConditionsFromQuery(queryStr.toLowerCase()), options)]
    }
}

function evaluateGroup<T>(objList: Set<T>, group: GroupQuery, options: SearchOptions): Set<T> {
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

function evaluateCondition<T>(objList: Set<T>, condition: Query | GroupQuery, options: SearchOptions): Set<T> {
    if ('conditions' in condition) { return evaluateGroup(objList, condition, options) }
    
    const resultSet = new Set<T>()
    for (const obj of objList) {
        if (condition.negated !== findQuery(obj, condition, EMPTY_STR, options)) {
            resultSet.add(obj)
        }
    }
    return resultSet
}

function findQuery(obj: any, query: Query, nestedKeys: string, options: SearchOptions, keyFound?: boolean): boolean {
    if (obj === null || obj === void 0 || typeof obj !== OBJECT) { return false }
    const keys = Object.keys(obj)

    nestedKeys += KEY_SEPARATOR
    for (const key of keys) {
        const newNestedKeys = nestedKeys + key.toLowerCase()

        if (isExcluded(newNestedKeys, options.excludeKeys)) { continue }

        if (keyFound === void 0) {
            if (newNestedKeys.indexOf(query.key) === UNKNOWN) {
                if (findQuery(obj[key], query, newNestedKeys, options)) { return true }
                if (options.allowKeyValueMatching && query.value === void 0 && match(query.key, obj[key], query.type, options)) { return true }
                continue
            }

            if (query.value === void 0) { return true }
        }

        if (match(query.value, obj[key], query.type, options) || findQuery(obj[key], query, newNestedKeys, options, true)) {
            return true
        }
    }
    return false
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

        let key = m[TOKEN.KEY]
        let value = m[TOKEN.QUOTED_VALUE] || void 0

        if (key === void 0) {
            key = value !== void 0 ? KEY_SEPARATOR : getUnquotedValue(m[TOKEN.VALUE])
        } else if (value === void 0) {
            value = getUnquotedValue(m[TOKEN.VALUE])
        }

        if (key || value) {
            const type = m[TOKEN.TYPE] && m[TOKEN.TYPE] !== TOKEN_SEPARATOR ? m[TOKEN.TYPE].charAt(0) : void 0
            group.conditions.push(getQuery(!!m[TOKEN.NEGATED], type, key, value))
        }

        if (m[TOKEN.OPERATOR] === GROUP_END) { break }
        if (m[TOKEN.OPERATOR]) { group.lastCondition()!.operator = Operator.from(m[TOKEN.OPERATOR]) }
    }

    return group
}

function getQuery(negated: boolean, type?: string, key?: string, value?: string): Query {

    const query: Query = { negated, key: removeEscapeChar(key), type, value: removeEscapeChar(value) }

    if (!query.type) { return query }
    
    if (!query.value || query.value.trim() === EMPTY_STR) {
        delete query.type
        delete query.value
        return query
    }

    if (query.type === REGEX_CHAR) {
        try {
            query.value = new RegExp(query.value, 'i')
        } catch (_e) {
            delete query.type
            delete query.value
        }
        return query
    }            
    
    const matches = query.value.match(RANGE_REGEXP)
    if (!matches) {
        delete query.type
        delete query.value
        return query
    }

    query.value = { min: parseFloat(matches[1]), max: parseFloat(matches[3]) }
    !query.value.min && query.value.min !== 0 && delete query.value.min
    !query.value.max && query.value.max !== 0 && delete query.value.max

    if (query.value.min === void 0 && query.value.max === void 0) {
        delete query.type
        delete query.value
    }

    return query
}

function match(expectedValue: any, value: any, type: string, options: SearchOptions): boolean {
    if (value === null || value === void 0) { return false }
    
    const typeOf = typeof value

    if (typeOf === OBJECT) {
        if (options.matchChildKeysAsValues) {
            for (const v of Object.keys(value)) {
                if (match(expectedValue, v, type, options)) { return true }
            }
        }
        return false
    }

    if (type === RANGE_CHAR) {
        if (typeOf !== NUMBER && typeOf !== BIGINT && !(options.allowNumericString && typeOf === STRING && !isNaN(value = +value))) { return false }
        return matchRange(expectedValue as Range, value)
    }
    
    if (type === REGEX_CHAR) { return (expectedValue as RegExp).test(value) }

    if (typeOf === STRING) {
        return `${value}`.toLowerCase().indexOf(expectedValue) !== UNKNOWN
    }

    if (typeOf === NUMBER || typeOf === BIGINT || typeOf === BOOLEAN) {
        return `${value}`.indexOf(expectedValue) !== UNKNOWN
    }

    return false
}

function matchRange(expectedRange: Range, numValue: number): boolean {
    if (expectedRange.min !== void 0 && expectedRange.max !== void 0) {
        return numValue >= expectedRange.min && numValue <= expectedRange.max
    } 
    if (expectedRange.min !== void 0) { return numValue >= expectedRange.min }
    return numValue <= expectedRange.max
}

function isExcluded(nestedKeys: string, excludedKeys?: string[]): boolean {
    if (excludedKeys) {
        for (const key of excludedKeys) { if (nestedKeys.endsWith(key)) { return true } }
    }
    return false
}

function removeEscapeChar(str?: string): string | void {    
    return str ? str.replace(/\\(.)/g, '$1') : str
}

function getUnquotedValue(value: string): string {
    return value !== EMPTY_VAL_GROUP && value !== VAL_TOKEN ? value : void 0
}

export default SearchEngine

module && (module.exports = SearchEngine)