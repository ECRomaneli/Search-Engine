const Search = require('../dist/npm/index')

describe('Search Engine', () => {
    // Test dataset with variety of data types, nested objects, and arrays
    const testData = [
        {
            id: 1,
            name: "John Smith",
            age: 30,
            active: true,
            tags: ["developer", "javascript"],
            contact: {
                email: "john.smith@example.com",
                phone: "555-1234"
            }
        },
        {
            id: 2,
            name: "Jane Doe",
            age: 25,
            active: true,
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
            tags: ["manager", "sales"],
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
            tags: ["intern", "golang"],
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
            const query = "active:true and age:30"
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
            const query = "active:true and (age:25 or age:30)"
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
            const query = "active:true and tags:developer"
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
            const query = "not active:true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results[0].id).toBe(3)
            expect(results[1].id).toBe(5)
            expect(results[2].id).toBe(6)
        })

        test('Negation with other conditions', () => {
            const query = "not name:john and active:true"
            const results = Search.search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(2)
            expect(results[1].id).toBe(4)
        })

        test('Negation of groups', () => {
            const query = "not(not(not((name:john or not active:true))))"
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
            const query = "active:true and (age~:25-30 or tags:python)"
            const results = Search.search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })

        test('Complex expression', () => {
            const query = 'not (not active:"true" or not (not(not age~:"25-30"))) or((((not active:true))) and ((((age:35)))))'
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
                or(skill_level and not (active:false))
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
})
