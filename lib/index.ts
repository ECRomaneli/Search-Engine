'use strict'

const TOKEN_SEPARATOR = ':'
const REGEX_CHAR = '*'
const RANGE_CHAR = '~'
const GROUP_START = '('
const GROUP_END = ')'
const EMPTY_QUOTES_STR = '""'
const KEY_SEPARATOR = '.'
const NEGATED_PREFIX = 'not'
const RANGE_REGEXP = /^[-\D]*(-?\d+(\.\d+)?)?[-\D]*-[-\D]*(-?\d+(\.\d+)?)?[-\D]*$/
const TOKENIZER = new RegExp(` *(${NEGATED_PREFIX})? *(\\${GROUP_START})| *(${NEGATED_PREFIX} +)?(?:((?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\${REGEX_CHAR}${RANGE_CHAR}${TOKEN_SEPARATOR}])+) *([${REGEX_CHAR}${RANGE_CHAR}]?${TOKEN_SEPARATOR}))? *("((?:\\\\.|[^"\\\\])+)"|(?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\])+)? *(and|or|\\${GROUP_END}|$)`, 'g')
const TOKEN = { GROUP_NEGATED: 1, GROUP_START: 2, NEGATED: 3, KEY: 4, TYPE: 5, VALUE: 6, QUOTED_VALUE: 7, OPERATOR: 8 }
const UNKNOWN = -1
const EMPTY_ARR: any[] = []
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


/**
 * Search through an array of objects using a powerful query syntax
 * 
 * @param objList - Array of objects to search
 * @param queryStr - Query string (e.g. "name:john and age~:20-30")
 * @param exclude - Array of keys to exclude from search
 * @returns Array of matched objects
 */
function search<T extends Record<string, any>>(objList: T[], queryStr: string, exclude?: string[]): T[] {
    if (!objList) { return [] }
    if (!queryStr || queryStr.trim() === EMPTY_STR) { return objList.slice() }
    return [...evaluateGroup(new Set(objList), extractConditionsFromQuery(queryStr.toLowerCase()), exclude)]
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
            key = value !== void 0 ? KEY_SEPARATOR : m[TOKEN.VALUE]
        } else if (value === void 0) {
            value = m[TOKEN.VALUE] !== EMPTY_QUOTES_STR ? m[TOKEN.VALUE] : void 0
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

    query.value = { min: parseFloat(matches[1]) || void 0, max: parseFloat(matches[3]) || void 0 }

    if (query.value.min === void 0 && query.value.max === void 0) {
        delete query.type
        delete query.value
    }

    return query
}

function evaluateGroup<T>(objList: Set<T>, group: GroupQuery, exclude?: string[]): Set<T> {
    if (group.conditions.length === 0) { return group.negated ? new Set() : objList }
    
    let currentResults = evaluateCondition(objList, group.conditions[0], exclude)
    
    for (let i = 1; i < group.conditions.length; i++) {
        const condition = group.conditions[i]
        const previousOperator = group.conditions[i - 1].operator
        
        if (previousOperator && previousOperator === Operator.OR) {
            const nextResults = evaluateCondition(objList, condition, exclude)
            nextResults.forEach(item => currentResults.add(item))
        } else {
            currentResults = evaluateCondition(currentResults, condition, exclude)
        }
    }
    
    if (!group.negated) { return currentResults }

    // If the group is negated, return everything except the group results
    const negatedResult = new Set<T>()
    for (const obj of objList) { currentResults.has(obj) || negatedResult.add(obj) }
    return negatedResult
}

function evaluateCondition<T>(objList: Set<T>, condition: Query | GroupQuery, exclude?: string[]): Set<T> {
    if ('conditions' in condition) { return evaluateGroup(objList, condition, exclude) }
    
    const resultSet = new Set<T>()
    objList.forEach(obj => {
        if (condition.negated !== findQuery(obj, condition, EMPTY_STR, exclude)) {
            resultSet.add(obj)
        }
    })
    return resultSet
}

function findQuery(obj: any, query: Query, nestedKeys: string, excludedKeys?: string[], keyFound?: boolean): boolean {
    const keys = getObjectKeys(obj)
    nestedKeys += KEY_SEPARATOR
    for (const key of keys) {
        const newNestedKeys = nestedKeys + key.toLowerCase()

        if (isExcluded(newNestedKeys, excludedKeys)) { continue }

        if (keyFound === void 0) {
            if (newNestedKeys.indexOf(query.key!) === UNKNOWN) {
                if (findQuery(obj[key], query, newNestedKeys, excludedKeys)) {
                    return true
                }
                continue
            }

            if (query.value === void 0) { return true }
        }

        if (match(query.value, obj[key], query.type) || findQuery(obj[key], query, newNestedKeys, excludedKeys, true)) {
            return true
        }
    }
    return false
}

function match(expectedValue: any, value: any, type?: string): boolean {
    if (value === null || value === void 0) { return false }
    
    const typeOf = typeof value

    if (type === RANGE_CHAR) {
        if (typeOf !== NUMBER && typeOf !== BIGINT) { return false }
        return matchRange(expectedValue as Range, Number(value))
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
    return !!excludedKeys && excludedKeys.some((key) => nestedKeys.endsWith(key))
}

function getObjectKeys(obj: Object): string[] {
    return typeof obj === OBJECT && obj !== null ? Object.keys(obj) : EMPTY_ARR
}

function removeEscapeChar(str?: string): string | void {    
    return str ? str.replace(/\\(.)/g, '$1') : str
}

export { search }