const { search } = require('./index')

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
                phone: "555-9012"
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
                phone: "555-3456"
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
                phone: "555-7890"
            }
        },
        {
            id: 6,
            name: "Eve Davis",
            age: 31,
            active: false,
            tags: ["intern", "golang"],
            "a5(d00)+~*:~": "uncommon key"
        }
    ]

    // Basic functionality tests
    test('Empty/null inputs handling', () => {
        expect(search(testData, "")).toEqual(testData)
        expect(search(testData, null)).toEqual(testData)
        expect(search(null, "name:john")).toEqual([])
        expect(search(undefined, "name:john")).toEqual([])
    })

    // 1. Boolean operators tests
    describe('Boolean Operators', () => {
        test('AND operator', () => {
            const query = "active:true and age:30"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('OR operator', () => {
            const query = "age:25 or age:30"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })

        test('Multiple AND/OR operators', () => {
            const query = "active:true and (age:25 or age:30)"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })
    })

    // 2. Field-specific searches
    describe('Field-specific searches', () => {
        test('Search by specific field', () => {
            const query = "name:john"
            const results = search(testData, query)
            expect(results.length).toBe(2) // Matches "John" and "Johnson"
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(3)
        })

        test('Search by multiple fields', () => {
            const query = "active:true and tags:developer"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })
    })

    // 3. Wildcards and regex pattern matching
    describe('Wildcards and regex pattern matching', () => {
        test('Simple wildcard search', () => {
            const query = "name*:j.*n"  // Matches "John", "Jane", and "Johnson"
            const results = search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 3)).toBe(true)
        })

        test('Complex regex patterns', () => {
            const query = 'email*:alice|jane'  // Matches emails with alice or jane
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })
    })

    // 4. Numeric range searches
    describe('Numeric range searches', () => {
        test('Inclusive range', () => {
            const query = "age~:25-30"
            const results = search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })

        test('Lower bound only', () => {
            const query = "age~:35-"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 3)).toBe(true)
            expect(results.some(r => r.id === 5)).toBe(true)
        })

        test('Upper bound only', () => {
            const query = "age~:-30"
            const results = search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })
    })

    // 5. Logical negation
    describe('Logical negation', () => {
        test('Simple negation', () => {
            const query = "not active:true"
            const results = search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 3)).toBe(true)
            expect(results.some(r => r.id === 5)).toBe(true)
            expect(results.some(r => r.id === 6)).toBe(true)
        })

        test('Negation with other conditions', () => {
            const query = "not name:john and active:true"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })
    })

    // 6. Nested property searching
    describe('Nested property searching', () => {
        test('Search in nested objects', () => {
            const query = "contact.email:jane"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })

        test('Deep nested search', () => {
            const query = "contact.phone:555-1234"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Deep search', () => {
            const query = "contact:555-1234"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Relative search', () => {
            const query = "phone:555-1234"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })

        test('Array item search', () => {
            const query = "tags:javascript"
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })
    })

    // 7. Logical grouping with parentheses
    describe('Logical grouping with parentheses', () => {
        test('Simple grouping', () => {
            const query = "(age:25 or age:30)"
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
        })

        test('Nested grouping', () => {
            const query = "active:true and (age~:25-30 or tags:python)"
            const results = search(testData, query)
            expect(results.length).toBe(3)
            expect(results.some(r => r.id === 1)).toBe(true)
            expect(results.some(r => r.id === 2)).toBe(true)
            expect(results.some(r => r.id === 4)).toBe(true)
        })

        test('Complex expression', () => {
            const query = '(active:"true" and ((age~:"25-30"))) or((((not active:true))) and ((((age:35)))))'
            const results = search(testData, query)
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
            const resultsWithoutExclusion = search(testData, query)
            expect(resultsWithoutExclusion.length).toBe(1)
            
            const resultsWithExclusion = search(testData, query, ['contact.phone'])
            expect(resultsWithExclusion.length).toBe(0)
        })

        test('Quoted values with spaces', () => {
            const query = 'name:"John Smith"'
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(1)
        })
        
        test('Numeric values as strings', () => {
            const query = 'skill_level:9'
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(5)
        })
        
        // New tests for quoted values
        test('Quoted values with special characters', () => {
            const query = 'tags:"ui/ux"'  // Special character / in quoted value
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })
    
        test('Quoted values with boolean operators inside', () => {
            const query = 'name:"and"'  // Looking for literal "and" in name
            const results = search(testData, query) 
            expect(results.length).toBe(0)  // None of our data has "and" in name
        })
    
        test('Multiple quoted values with AND', () => {
            const query = 'tags:"developer" and name:"Alice Williams"'
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(4)
        })
    
        test('Empty quoted values', () => {
            const query = 'name:""'
            const results = search(testData, query)
            console.log(results)
            expect(results.length).toBe(6)  // Everything has a name
        })
    
        test('Quoted values in nested properties', () => {
            const query = 'contact.email:"jane.doe@example.com"'
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(2)
        })

        test('Quoted values without field specified', () => {
            const query = '"John Smith" or "Jane Doe"'
            const results = search(testData, query)
            expect(results.length).toBe(2)
            expect(results[0].id).toBe(1)
            expect(results[1].id).toBe(2)
        })

        test('Fields and values matching the same query', () => {
            let query = 'skill_level'
            let results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(5)

            query = '"skill_level"'
            results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(4)
        })

        test('Uncommon key', () => {
            const query = 'a5\\(d00\\)+\\~\\*\\:\\~: "uncommon key"'
            const results = search(testData, query)
            expect(results.length).toBe(1)
            expect(results[0].id).toBe(6)
        })
    })
})