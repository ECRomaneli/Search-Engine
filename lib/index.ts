'use strict'

const TOKEN_SEPARATOR = ':'
const REGEX_CHAR = '*'
const RANGE_CHAR = '~'
const GROUP_START = '('
const GROUP_END = ')'
const EMPTY_QUOTES_STR = '""'
const KEY_SEPARATOR = '.'
const NEGATED_PREFIX = 'not '
const RANGE_REGEXP = /^[-\D]*(-?\d+(\.\d+)?)?[-\D]*-[-\D]*(-?\d+(\.\d+)?)?[-\D]*$/
const TOKENIZER = new RegExp(` *(\\${GROUP_START})| *(${NEGATED_PREFIX}+)?(?:((?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\${REGEX_CHAR}${RANGE_CHAR}${TOKEN_SEPARATOR}])+) *([${REGEX_CHAR}${RANGE_CHAR}]?${TOKEN_SEPARATOR}))? *("((?:\\\\.|[^"\\\\])+)"|(?:\\\\.|[^ ${GROUP_START}${GROUP_END}\\\\])+)? *(\\${GROUP_END})? *(and|or|\\)|$)`, 'g')
const TOKEN = { GROUP_START: 1, NEGATED: 2, KEY: 3, TYPE: 4, VALUE: 5, QUOTED_VALUE: 6, GROUP_END: 7, OPERATOR: 8 }
const UNKNOWN = -1
const EMPTY_ARR: any[] = []
const EMPTY_STR = ''
const STRING = 'string'
const NUMBER = 'number'
const BOOLEAN = 'boolean'
const BIGINT = 'bigint'

interface Query {
    key: any
    value: any
    type: string | void
    operator?: Operator
    negated?: boolean
}

interface Range {
    min?: number
    max?: number
}

class GroupQuery {
    conditions: (Query | GroupQuery)[]
    operator?: Operator

    constructor() {
        this.conditions = []
        this.operator = undefined
    }

    lastCondition(): Query | GroupQuery | undefined {
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

    return [...evaluateConditions(objList, extractConditionsFromQuery(queryStr.toLowerCase()), exclude)]
}

function extractConditionsFromQuery(query: string, regex = new RegExp(TOKENIZER), group = new GroupQuery()): GroupQuery {
    let m: RegExpExecArray | null
    while ((m = regex.exec(query)) !== null && m[0] !== EMPTY_STR) {                
        if (m[TOKEN.GROUP_START]) {
            group.conditions.push(extractConditionsFromQuery(query, regex))
            continue
        }

        let key = m[TOKEN.KEY]
        let value = m[TOKEN.QUOTED_VALUE] || undefined

        if (key === undefined) {
            key = value !== undefined ? KEY_SEPARATOR : m[TOKEN.VALUE]
        } else if (value === undefined) {
            value = m[TOKEN.VALUE] !== EMPTY_QUOTES_STR ? m[TOKEN.VALUE] : undefined
        }

        if (key || value) {
            const type = m[TOKEN.TYPE] && m[TOKEN.TYPE] !== TOKEN_SEPARATOR ? m[TOKEN.TYPE].charAt(0) : undefined
            group.conditions.push(getQuery(!!m[TOKEN.NEGATED], type, key, value))
        }

        if (m[TOKEN.OPERATOR] === GROUP_END) {
            m[TOKEN.GROUP_END] = GROUP_END
            m[TOKEN.OPERATOR] = undefined
        }

        if (m[TOKEN.GROUP_END]) {
            if (m[TOKEN.OPERATOR]) { group.operator = Operator.from(m[TOKEN.OPERATOR]) }
            break
        }

        if (m[TOKEN.OPERATOR]) { group.lastCondition()!.operator = Operator.from(m[TOKEN.OPERATOR]) }
    }

    return group
}

function getQuery(negated: boolean, type: string | void, key: string | void, value: string | void): Query {

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

    query.value = { min: parseFloat(matches[1]) || undefined, max: parseFloat(matches[3]) || undefined }

    if (query.value.min === undefined && query.value.max === undefined) {
        delete query.type
        delete query.value
    }

    return query
}

function evaluateConditions<T>(objList: T[], group: GroupQuery, exclude?: string[]): Set<T> {
    if (group.conditions.length === 0) { return new Set(objList) }
    
    let currentResults = evaluateCondition(objList, group.conditions[0], exclude)
    
    for (let i = 1; i < group.conditions.length; i++) {
        const condition = group.conditions[i]
        const previousOperator = group.conditions[i - 1].operator
        
        if (previousOperator && previousOperator === Operator.OR) {
            const nextResults = evaluateCondition(objList, condition, exclude)
            nextResults.forEach(item => currentResults.add(item))
        } else {
            currentResults = evaluateCondition([...currentResults], condition, exclude)
        }
    }
    
    return currentResults
}

function evaluateCondition<T>(objList: T[], condition: Query | GroupQuery, exclude?: string[]): Set<T> {
    if ('conditions' in condition) { return evaluateConditions(objList, condition, exclude) }
    const resultSet = new Set<T>()
    objList.forEach(obj => {
        if (condition.negated !== findQuery(obj, condition, EMPTY_STR, exclude)) {
            resultSet.add(obj)
        }
    })
    return resultSet
}

function findQuery(obj: any, query: Query, nestedKeys: string, excludedKeys?: string[], keyFound?: boolean): boolean {
    return getObjectKeys(obj).some((key) => {
        const newNestedKeys = nestedKeys + KEY_SEPARATOR + key.toLowerCase()

        if (isExcluded(newNestedKeys, excludedKeys)) { return false }
        
        if (keyFound === undefined) {
            if (newNestedKeys.indexOf(query.key!) === UNKNOWN) {
                return findQuery(obj[key], query, newNestedKeys, excludedKeys)
            }

            if (query.value === undefined) { return true }
        }

        return match(query.value, obj[key], query.type) || 
               findQuery(obj[key], query, newNestedKeys, excludedKeys, true)
    })
}

function match(expectedValue: any, value: any, type: string | void): boolean {
    if (value === null || value === undefined) { return false }
    
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
    if (expectedRange.min !== undefined && expectedRange.max !== undefined) {
        return numValue >= expectedRange.min && numValue <= expectedRange.max
    } 
    if (expectedRange.min !== undefined) { return numValue >= expectedRange.min }
    return numValue <= expectedRange.max
}

function isExcluded(nestedKeys: string, excludedKeys?: string[]): boolean {
    return !!excludedKeys && excludedKeys.some((key) => nestedKeys.endsWith(key))
}

function getObjectKeys(obj: any): string[] {
    return obj instanceof Object ? Object.keys(obj) : EMPTY_ARR
}

function removeEscapeChar(str: string | void): string | void {    
    return str ? str.replace(/\\(.)/g, '$1') : str
}

export { search }