# Search-Engine

A lightweight, powerful object search engine for JavaScript with advanced query syntax

<p>
    <a href="https://github.com/ECRomaneli/Search-Engine/tags"><img src="https://img.shields.io/github/v/tag/ecromaneli/Search-Engine?label=version&sort=semver" alt="Version"></a>
    <a href="https://github.com/ECRomaneli/Search-Engine/commits/master"><img src="https://img.shields.io/github/last-commit/ecromaneli/Search-Engine" alt="Last Commit"></a>
    <a href="https://github.com/ECRomaneli/Search-Engine/blob/master/LICENSE"><img src="https://img.shields.io/github/license/ecromaneli/Search-Engine" alt="License"></a>
    <a href="https://github.com/ECRomaneli/Search-Engine/issues"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg" alt="Contributions Welcome"></a>
</p>

## Installation

```bash
npm install @ecromaneli/search-engine
```

## Download

For browser usage, you can download and use the pre-built version:

1. Go to the [Releases page](https://github.com/ECRomaneli/Search-Engine/releases/latest)
2. Download the `search-engine-web.zip` file 
3. Extract the ZIP and include the script in your HTML:

```html
<!-- Include the script in your HTML file -->
<script src="path/to/search-engine.js"></script>
<!-- Or use the minified version -->
<!-- <script src="path/to/search-engine.min.js"></script> -->

<script>
  // Sample data
  const users = [
    { id: 1, name: 'John Doe', age: 28, tags: ['developer', 'javascript'] },
    { id: 2, name: 'Jane Smith', age: 34, tags: ['designer', 'ui/ux'] },
    { id: 3, name: 'Bob Johnson', age: 45, tags: ['manager', 'finance'] }
  ];
  
  // Use SearchEngine.search() directly
  const results = SearchEngine.search(users, 'name:john');
  console.log(results);
</script>
```

## Features

- Powerful query language with boolean operators (AND/OR)
- Field-specific searches
- Support for wildcards and regex pattern matching
- Numeric range searches
- Logical negation of search terms
- Nested property searching
- Logical grouping with parentheses
- Zero dependencies

## Basic Usage

```javascript
const { search } = require('@ecromaneli/search-engine')

// Sample data
const users = [
  { id: 1, name: 'John Doe', age: 28, tags: ['developer', 'javascript'] },
  { id: 2, name: 'Jane Smith', age: 34, tags: ['designer', 'ui/ux'] },
  { id: 3, name: 'Bob Johnson', age: 45, tags: ['manager', 'finance'] }
]

// Simple search
const result1 = search(users, 'john')  // Find users with "john" in any field

// Field-specific search
const result2 = search(users, 'name:jane')  // Find users with "jane" in the name field

// Age range search
const result3 = search(users, 'age~:25-35')  // Find users with age between 25 and 35

// Complex search with boolean operators and grouping
const result4 = search(users, '("developer" or "designer") and not age~:40-50')
```

## Query Syntax Reference

### Basic Queries

- `field` - Search for "field" with any value
- `"value"` - Search for "value" in any field
- `field:value` - Search for "value" in the specific field

### Specialized Searches

- `field*:pattern` - Regex pattern match on field
- `field~:min-max` - Numeric range search (min and max are optional)

### Boolean Operators

- `term1 and term2` - Both terms must match
- `term1 or term2` - Either term must match

### Negation and Grouping

- `not term` - Term must not match
- `not (term1 or term2) and term3` - Logical grouping with parentheses

## API Reference

### search(objList, queryStr, exclude)

- **objList** (Array): Array of objects to search through
- **queryStr** (String): Query string following the syntax described above
- **exclude** (Array, optional): Array of property names to exclude from searching
- **Returns** (Array): Array of matching objects

## Author

Created by [Emerson Capuchi Romaneli](https://github.com/ECRomaneli) (@ECRomaneli).

## License

This project is licensed under the [MIT License](https://github.com/ECRomaneli/Search-Engine/blob/master/LICENSE).
