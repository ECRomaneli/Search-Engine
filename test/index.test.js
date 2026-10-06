const Search = require('../dist/npm/index')

describe('Search Engine', () => {
    // Test dataset with variety of data types, nested objects, and arrays
    const testData = [
        {
            id: 1,
            name: "John Smith",
            age: 30,
            active: true,
            isTrial: null,
            tags: ["developer", "javascript"],
            contact: {
                email: "john.smith@example.com",
                phone: "555-1234",
                website: "https://example.com",
            }
        },
        {
            id: 2,
            name: "Jane Doe",
            age: 25,
            active: true,
            isTrial: false,
            tags: ["designer", "ui/ux"],
            contact: {
                email: "jane.doe@example.com",
                phone: "555-5678"
            }
        },
        {
            id: 3,
            name: "Bob Johnson",
            age: 45,
            active: false,
            isTrial: true,
            tags: [],
            contact: {
                email: "bob.johnson@example.com",
                phone: "555-9012",
                zip: "30001"
            }
        },
        {
            id: 4,
            name: "Alice Williams",
            age: 28,
            active: true,
            isTrial: undefined,
            tags: ["developer", "python"],
            issues: ["skill_level"],
            contact: {
                email: "alice.williams@example.com",
                phone: "555-3456",
                address: {
                    city: "New York",
                    zip: "10001"
                }
            }
        },
        {
            id: 5,
            name: "Charlie Brown",
            age: 35,
            active: false,
            isTrial: '',
            tags: ["designer", "graphic"],
            skill_level: 9,
            contact: {
                email: "charlie.brown@example.com",
                phone: "555-7890",
                zip: "20001"
            }
        },
        {
            id: 6,
            name: "Eve Davis",
            age: 31,
            score: -5,
            active: false,
            isTrial: true,
            tags: ["intern", "golang", ["ui", "ux"]],
            "a5(d00)+~*:~": "uncommon key"
        }
    ]

    // Basic functionality tests
    test('Empty/null inputs handling', () => {
        expect(Search.search(testData, "")).toEqual(testData)
        expect(Search.search(testData, null)).toEqual(testData)
        expect(Search.search(testData, undefined)).toEqual(testData)
        expect(Search.search(null, "name:john")).toEqual([])
        expect(Search.search(undefined, "name:john")).toEqual([])
    })

    // 1. Boolean operators tests
    describe('Boolean Operators', () => {
        test('AND operator', () => {
            const query = "active is true and age:30"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('OR operator', () => {
            const query = "age:25 or age:30"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })

        test('Multiple AND/OR operators', () => {
            const query = "active is true and (age:25 or age:30)"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })
    })

    // 2. Field-specific searches
    describe('Field-specific searches', () => {
        test('Search by specific field', () => {
            const query = "name:john"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2) // Matches "John" and "Johnson"
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(3)
        })

        test('Search by multiple fields', () => {
            const query = "active is true and tags:developer"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(4)
        })
    })

    // 3. Wildcards and regex pattern matching
    describe('Wildcards and regex pattern matching', () => {
        test('Simple wildcard search', () => {
            const query = "name*:j.*n"  // Matches "John", "Jane", and "Johnson"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)
            expect(results[2].id).toBe(3)
        })

        test('Complex regex patterns', () => {
            const query = 'email*:alice|jane'  // Matches emails with alice or jane
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(2)
            expect(results[1].id).toBe(4)
        })

        test('Avoid object parse to string [object Object]', () => {
            const query = 'contact*:object'  // Matches emails with alice or jane
            const results = Search.search(testData, query)
            expect(results.length).toBe(0)
        })
    })

    describe('Special matches handling', () => {
        test('True statement', () => {
            const query = "isTrial is true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
        })

        test('False statement', () => {
            const query = "isTrial is not true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(4)
        })

        test('Null statement', () => {
            const query = "isTrial is null"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Undefined statement', () => {
            const query = "isTrial is undef"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(4)
        })

        test('Blank string statement', () => {
            const query = "isTrial is blank"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(5)
        })

        test('Empty array statement', () => {
            const query = "tags is empty"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(3)
        })

        test('Special match fallback', () => {
            const query = "name is john"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(3)
        })
    })

    // 4. Numeric range searches
    describe('Numeric range searches', () => {
        test('Inclusive range', () => {
            const query = "age~:25-30"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)
            expect(results[2].id).toBe(4)
        })

        test('Exclusive range', () => {
            const query = "not age~:25-30"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(3)
            expect(results[1].id).toBe(5)
            expect(results[2].id).toBe(6)
        })

        test('Range with string numeric values', () => {
            const query = "zip~:10000-20001"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(4)
            expect(results[1].id).toBe(5)
        })

        test('Lower bound only', () => {
            const query = "age~:35-"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(3)
            expect(results[1].id).toBe(5)
        })

        test('Upper bound only', () => {
            const query = "age~:-30"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)
            expect(results[2].id).toBe(4)
        })

        // Bugfixed: Zeros where recognized as no bounds
        test('Zero as range', () => {
            const query = "score~:0-"
            const results = Search.search(testData, query)
            expect(results.length).toBe(0)
        })

        test('Zero as range with negative values', () => {
            const query = "score~:-10-0"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(6)
        })
    })

    // 5. Logical negation
    describe('Logical negation', () => {
        test('Simple negation', () => {
            const query = "not active is true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(3)
            expect(results[1].id).toBe(5)
            expect(results[2].id).toBe(6)
        })

        test('Negation with other conditions', () => {
            const query = "not name:john and active is true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(2)
            expect(results[1].id).toBe(4)
        })

        test('Negation of groups', () => {
            const query = "not(not(not((name:john or not active is true))))"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(2)
            expect(results[1].id).toBe(4)
        })
    })

    // 6. Nested property searching
    describe('Nested property searching', () => {
        test('Search in nested objects', () => {
            const query = "contact.email:jane"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })

        test('Deep nested search', () => {
            const query = "contact.phone:555-1234"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Deep search', () => {
            const query = "contact:555-1234"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Relative search', () => {
            const query = "phone:555-1234"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Array item search', () => {
            const query = "tags:javascript"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Array length search', () => {
            const query = "tags.length: 3"
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(6)
        })
    })

    // 7. Logical grouping with parentheses
    describe('Logical grouping with parentheses', () => {
        test('Simple grouping', () => {
            const query = "(age:25 or age:30)"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })

        test('Simple grouping De Morgan', () => {
            const query = "not (not age:25 and not age:30)"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })

        test('Nested grouping', () => {
            const query = "active is true and (age~:25-30 or tags:python)"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })

        test('Complex expression', () => {
            const query = 'not (not active is true or not (not(not age~:"25-30"))) or((((active is not true))) and ((((age:35)))))'
            const results = Search.search(testData, query)
            expect(results.length).toBe(4)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
            expect(results.some(r => r.id === 5)).toBe(true)
        })
    })

    // Additional tests for edge cases
    describe('Edge cases', () => {
        test('Excluded keys', () => {
            const query = "\"555-1234\""
            const resultsWithoutExclusion = Search.search(testData, query)
            expect(resultsWithoutExclusion.length).toBe(1)
            
            const resultsWithExclusion = Search.search(testData, query, { excludeKeys: ['contact.phone'] })
            expect(resultsWithExclusion.length).toBe(0)
        })

        test('Range excluding string numeric values', () => {
            const query = "zip~:10000-20001"
            const results = Search.search(testData, query, { allowNumericString: false })
            expect(results.length).toBe(0)
        })
        
        test('Quoted values with spaces', () => {
            const query = 'name:"John Smith"'
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })
        
        test('Numeric values as strings', () => {
            const query = 'skill_level:9'
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(5)
        })
        
        // New tests for quoted values
        test('Quoted values with special characters', () => {
            const query = 'tags:"ui/ux"'  // Special character / in quoted value
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })

        test('Partially quoted values', () => {
            let query = 'name:"Smith'
            let results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)

            query = '"John Smith" or "Jane Doe'
            results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)

            query = '"John Smith" and "https:'
            results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Empty partially quoted values', () => {
            let query = 'name:"'
            let results = Search.search(testData, query)
            console.log(results)
            expect(results.length).toBe(6)

            query = '"'
            results = Search.search(testData, query)
            console.log(results)
            expect(results.length).toBe(6) 
        })
    
        test('Quoted values with boolean operators inside', () => {
            const query = 'name:"and"'  // Looking for literal "and" in name
            const results = Search.search(testData, query) 
            expect(results.length).toBe(0)  // None of our data has "and" in name
        })
    
        test('Multiple quoted values with AND', () => {
            const query = 'tags:"developer" and name:"Alice Williams"'
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(4)
        })
    
        test('Empty quoted values', () => {
            const query = 'name:""'
            const results = Search.search(testData, query)
            console.log(results)
            expect(results.length).toBe(6)  // Everything has a name
        })
    
        test('Quoted values in nested properties', () => {
            const query = 'contact.email:"jane.doe@example.com"'
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })

        test('Quoted values without field specified', () => {
            const query = '"John Smith" or "Jane Doe"'
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)
        })

        test('Fields and values matching the same query', () => {
            let query = 'skill_level'
            let results = Search.search(testData, query, { allowKeyValueMatching: false })
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(5)

            query = '"skill_level"'
            results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(4)
        })

        test('Child keys as values', () => {
            let query = 'contact: zip'
            let results = Search.search(testData, query, { matchChildKeysAsValues: true })
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(3)
            expect(results[1].id).toBe(4)
            expect(results[2].id).toBe(5)

            query = 'not contact: zip'
            results = Search.search(testData, query, { matchChildKeysAsValues: true })
            expect(results.length).toBe(testData.length - 3)
            expect(!results.some(r => [3, 4, 5].includes(r.id))).toBe(true)
        })

        test('Include values in key search', () => {
            const query = "skill_level"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(4)
            expect(results[1].id).toBe(5)
        })

        test('Uncommon key', () => {
            const query = 'a5\\(d00\\)+\\~\\*\\:\\~: "uncommon key"'
            const results = Search.search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(6)
        })

        test('Uncommon groups', () => {
            const query = 'not(not())'
            const results = Search.search(testData, query)
            expect(results.length).toBe(6)
        })
    })

    describe('All features together', () => {
        test('Combined search with all features and no pattern', () => {
            // This complex query combines:
            // - Regex pattern matching (name*:^J)
            // - Range searches (age~:25-35)
            // - Negation (not tags:manager)
            // - Group negation (not (age:45 or tags:golang))
            // - Boolean operators (and/or)
            // - Multiple nested groups
            // - Field-only search (skill_level)
            // - Value-only search ("developer")
            
            const query = `
                (name*:^J and age~:25-35 and not tags:manager) 
                or 
                ((("developer"and not(age :  45 or tags:golang)) ))
                or(skill_level and not (active is false))
            `.replace(/\n/g, ' ').trim()
            
            const results = Search.search(testData, query)
            
            // Expected matches:
            // id:1 - John Smith: matches (name*:^J and age~:25-35)
            // id:2 - Jane Doe: matches (name*:^J and age~:25-35)
            // id:4 - Alice Williams: matches ("developer" and not (age:45 or tags:golang))
            
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
            
            // These should NOT match:
            expect(results.some(r => r.id === 3)).toBe(false) // Bob: age 45, tags:manager
            expect(results.some(r => r.id === 5)).toBe(false) // Charlie: active:false with skill_level
            expect(results.some(r => r.id === 6)).toBe(false) // Eve: tags:golang
        })
    
        test('Advanced De Morgan negation with all features', () => {
            // This query tests complex negation logic with De Morgan's laws
            // not(A and B) is equivalent to (not A or not B)
            const query = `
                not (
                    not (name*:^[JB] or age~:32-45) 
                    and 
                    not ("developer" or active:true)
                )
            `.replace(/\n/g, ' ').trim()
            
            const results = Search.search(testData, query)
            
            // This complex query resolves to:
            // (name*:^[JB] or age~:32-45) or ("developer" or active:true)
            // Which should match all records except id:6 (Eve)
            
            expect(results.length).toBe(5)
            expect(results.some(r => r.id === 6)).toBe(false)
            
            // Verify the breakdown of matching conditions:
            const exactQuery = '(name*:^[JB] or age~:32-45) or ("developer" or active:true)'
            const exactResults = Search.search(testData, exactQuery)
            expect(exactResults.length).toBe(5)
            expect(JSON.stringify(results.map(r => r.id).sort()))
                .toBe(JSON.stringify(exactResults.map(r => r.id).sort()))
        })
    })

    describe('Fuzzy search', () => {
        const ids = results => results.map(r => r.id)

        test('Disabled by default', () => {
            expect(ids(Search.search(testData, 'name: jhon'))).toEqual([])
            expect(ids(Search.search(testData, 'name: jhon', { fuzzy: false }))).toEqual([])
        })

        test('Enabled with defaults (damerau)', () => {
            expect(ids(Search.search(testData, 'name: jhon', { fuzzy: true }))).toEqual([1, 3])
            expect(ids(Search.search(testData, 'name: wiliams', { fuzzy: true }))).toEqual([4])
            expect(ids(Search.search(testData, 'name: charlei', { fuzzy: {} }))).toEqual([5])
        })

        test('Exact matches still work', () => {
            expect(ids(Search.search(testData, 'name: john', { fuzzy: true }))).toEqual([1, 3])
        })

        test('Levenshtein does not treat transpositions as a single edit', () => {
            expect(ids(Search.search(testData, 'name: jhon', { fuzzy: { algorithm: 'levenshtein' } }))).toEqual([])
            expect(ids(Search.search(testData, 'name: wiliams', { fuzzy: { algorithm: 'levenshtein' } }))).toEqual([4])
        })

        test('Subsequence algorithm', () => {
            expect(ids(Search.search(testData, 'name: jsmth', { fuzzy: { algorithm: 'subsequence' } }))).toEqual([1])
            expect(ids(Search.search(testData, 'name: awlms', { fuzzy: { algorithm: 'subsequence' } }))).toEqual([4])
            expect(ids(Search.search(testData, 'name: htimsj', { fuzzy: { algorithm: 'subsequence' } }))).toEqual([])
        })

        test('Tolerance', () => {
            // 4 chars * 0.25 = 1 edit, 4 chars * 0.5 = 2 edits
            expect(ids(Search.search(testData, 'name: jahn', { fuzzy: { tolerance: 0.25 } }))).toEqual([1, 2, 3])
            expect(ids(Search.search(testData, 'name: jxxn', { fuzzy: { tolerance: 0.25 } }))).toEqual([])
            expect(ids(Search.search(testData, 'name: jxxn', { fuzzy: { tolerance: 0.5 } }))).toEqual([1, 2, 3])
            expect(ids(Search.search(testData, 'name: jhon', { fuzzy: { tolerance: 0 } }))).toEqual([])
        })

        test('Max distance', () => {
            expect(ids(Search.search(testData, 'name: wxxliams', { fuzzy: { tolerance: 0.5 } }))).toEqual([4])
            expect(ids(Search.search(testData, 'name: wxxliams', { fuzzy: { tolerance: 0.5, maxDistance: 1 } }))).toEqual([])
            expect(ids(Search.search(testData, 'name: wiliams', { fuzzy: { maxDistance: 0 } }))).toEqual([])
        })

        test('Min length', () => {
            expect(ids(Search.search(testData, 'name: jhn', { fuzzy: { tolerance: 0.34 } }))).toEqual([1, 2, 3])
            expect(ids(Search.search(testData, 'name: jhn', { fuzzy: { tolerance: 0.34, minLength: 4 } }))).toEqual([])
            expect(ids(Search.search(testData, 'name: jhn', { fuzzy: { algorithm: 'subsequence', minLength: 4 } }))).toEqual([])
        })

        test('Numbers are not fuzzy matched, numeric strings are', () => {
            expect(ids(Search.search(testData, 'age: 31', { fuzzy: true }))).toEqual([6])
            expect(ids(Search.search(testData, 'age: 3o', { fuzzy: { tolerance: 0.5, minLength: 2 } }))).toEqual([])
            expect(ids(Search.search(testData, 'zip: 10002', { fuzzy: true }))).toEqual([4])
            expect(ids(Search.search(testData, 'zip: 10002', { fuzzy: { maxDistance: 0 } }))).toEqual([])
        })

        test('Keys are not fuzzy matched', () => {
            expect(ids(Search.search(testData, 'nmae: john', { fuzzy: true }))).toEqual([])
        })

        test('Bare terms fuzzy match values', () => {
            // "python" contains "thon", one edit away from "jhon"
            expect(ids(Search.search(testData, 'jhon', { fuzzy: true }))).toEqual([1, 3, 4])
            expect(ids(Search.search(testData, 'jhon', { fuzzy: true, allowKeyValueMatching: false }))).toEqual([])
            expect(ids(Search.search(testData, '"jhon"', { fuzzy: true }))).toEqual([1, 3, 4])
        })

        test('Regex, range and "is" queries are not fuzzy', () => {
            expect(ids(Search.search(testData, 'name*: jhon', { fuzzy: true }))).toEqual([])
            expect(ids(Search.search(testData, 'age~: 26-27', { fuzzy: true }))).toEqual([])
            expect(ids(Search.search(testData, 'active is ture', { fuzzy: true }))).toEqual([])
            expect(ids(Search.search(testData, 'isTrial is nulll', { fuzzy: true }))).toEqual([])
        })

        test('Boolean operators and negation', () => {
            expect(ids(Search.search(testData, 'not name: jhon', { fuzzy: true }))).toEqual([2, 4, 5, 6])
            expect(ids(Search.search(testData, 'name: jhon and age: 30', { fuzzy: true }))).toEqual([1])
            expect(ids(Search.search(testData, '(name: jhon or tags: desinger) and active is true', { fuzzy: true }))).toEqual([1, 2])
        })

        test('Child keys as values', () => {
            expect(ids(Search.search(testData, 'contact: adress', { fuzzy: true, matchChildKeysAsValues: true }))).toEqual([4])
        })

        test('Excluded keys', () => {
            expect(ids(Search.search(testData, 'jhon', { fuzzy: true, excludeKeys: ['name', 'email', 'tags'] }))).toEqual([])
        })

        test('Does not mutate the options', () => {
            const options = { fuzzy: { sort: true } }
            Search.search(testData, 'name: jhon', options)
            expect(options).toEqual({ fuzzy: { sort: true } })
        })

        test('Constructor options', () => {
            const engine = new Search({ fuzzy: { algorithm: 'levenshtein', tolerance: 0.5 } })
            expect(ids(engine.search(testData, 'name: jhon'))).toEqual([1, 2, 3])
        })

        test('Results are not sorted by relevance when sort is disabled', () => {
            expect(ids(Search.search(testData, 'name: jonson or name: doe', { fuzzy: true }))).toEqual([3, 2])
            expect(ids(Search.search(testData, 'name: jonson or name: doe', { fuzzy: { sort: false } }))).toEqual([3, 2])
        })

        test('Sort by relevance', () => {
            // Exact matches first, then fuzzy matches
            expect(ids(Search.search(testData, 'name: jonson or name: doe', { fuzzy: { sort: true } }))).toEqual([2, 3])
            expect(ids(Search.search(testData, 'name: jhon or name: doe', { fuzzy: { sort: true } }))).toEqual([2, 1, 3])

            // More matched conditions rank higher, ties keep the original order
            expect(ids(Search.search(testData, 'tags: developer or name: alice', { fuzzy: { sort: true } }))).toEqual([4, 1])

            // Closer matches rank higher
            const data = [
                { id: 1, name: 'clr' },
                { id: 2, name: 'color' },
                { id: 3, name: 'colour' }
            ]
            expect(ids(Search.search(data, 'name: colour', { fuzzy: { sort: true, tolerance: 0.5 } }))).toEqual([3, 2, 1])
            expect(ids(Search.search(data, 'name: colour', { fuzzy: { tolerance: 0.5 } }))).toEqual([1, 2, 3])
        })

        test('Sort by relevance with subsequence', () => {
            const data = [
                { id: 1, name: 'a-b-c' },
                { id: 2, name: 'abc' },
                { id: 3, name: 'ab-c' }
            ]
            expect(ids(Search.search(data, 'name: abc', { fuzzy: { algorithm: 'subsequence', sort: true } }))).toEqual([2, 3, 1])
        })
    })
})
