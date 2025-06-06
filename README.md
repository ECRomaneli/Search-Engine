# Search-Engine

A lightweight, powerful object search engine for JavaScript with advanced query syntax.

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

## Features

- Powerful query language with boolean operators (AND/OR)
- Field-specific searches
- Support for wildcards and regex pattern matching
- Numeric range searches
- Logical negation of search terms
- Nested property searching
- Logical grouping with parentheses
- Customizable search options
- Zero dependencies

## Basic Usage

```javascript
const SearchEngine = require('@ecromaneli/search-engine')

const users = [
  { id: 1, name: 'John Doe', age: 28, tags: ['developer', 'javascript'] },
  { id: 2, name: 'Jane Smith', age: 34, tags: ['designer', 'ui/ux'] },
  { id: 3, name: 'Bob Johnson', age: 45, tags: ['manager', 'finance'] }
]

const result = SearchEngine.search(users, 'name: john')
console.log(result)
```

## Using the SearchEngine Constructor

You can create a `SearchEngine` instance with specific options that will be used for all searches:

```javascript
const engine = new SearchEngine({
  excludeKeys: ['password', 'private.info'],
  allowNumericString: false,
  allowKeyValueMatching: true,
  matchChildKeysAsValues: false
})

const results = engine.search(users, 'age~: 25-35')
console.log(results)
```

## Search Options

The `SearchOptions` object allows you to customize the behavior of the search engine. Below is a table explaining each option:

| Option                   | Type       | Default | Description                                                                                     |
|--------------------------|------------|---------|-------------------------------------------------------------------------------------------------|
| `excludeKeys`            | `string[]` | `[]`    | Array of keys to exclude from search. Useful for excluding sensitive data.                      |
| `allowNumericString`     | `boolean`  | `true`  | Controls whether string values that can be parsed as numbers are used in range searches.        |
| `allowKeyValueMatching`  | `boolean`  | `true`  | When enabled, unquoted terms without a field/value separator match both field names and values. |
| `matchChildKeysAsValues` | `boolean`  | `false` | When enabled, after finding a matching key, also looks for the value in child object keys.      |

### Differences Between Options

- **`allowNumericString`**:
  - When `true`, strings like `"123"` will be treated as numbers in range searches.
  - When `false`, only actual numbers will be considered for range searches.

- **`allowKeyValueMatching`**:
  - When `true`, a query like `admin` will match both `{ admin: "value" }` and `{ key: "admin" }`.
  - When `false`, it will only match field names or values explicitly.

- **`matchChildKeysAsValues`**:
  - When `true`, a query like `foo:bar` will match both `{ foo: "bar" }` and `{foo: { bar: "value" }}`.
  - When `false`, it will only match `{ foo: "bar" }`.

## Query Syntax Reference

### Basic Queries

- `foo` - Search for objects having a field or value `foo`.
- `"value"` - Search for `"value"` in any field.
- `field: value` - Search for `value` in the specific `field`.

### Specialized Searches

- `field*: pattern` - Regex pattern match on field.
- `field~: min-max` - Numeric range search.
- `field~: 10-` - Numbers greater than or equal to 10.
- `field~: -20` - Numbers less than or equal to 20.

Negative values are also supported.

### Boolean Operators

- `term1 and term2` - Both terms must match.
- `term1 or term2` - Either term must match.

### Negation and Grouping

- `not term` - Term must not match.
- `not (term1 or term2)` - Group negation (neither term1 nor term2 should match).
- `(term1 or term2) and term3` - Logical grouping with parentheses.

## API Reference

### Static Methods

#### `SearchEngine.search(objList, queryStr, options)`

- **`objList`** (`Array`): Array of objects to search through.
- **`queryStr`** (`String`): Query string following the syntax described above.
- **`options`** (`Object`, optional): Search options object.
- **Returns** (`Array`): Array of matching objects.

### Instance Methods

To store the options, use the constructor below:

#### `new SearchEngine(options)`

- **`options`** (`Object`, optional): Search options object (see Options table).
- **Returns** (`SearchEngine`): A new `SearchEngine` instance with the specified options.

#### `searchInstance.search(objList, queryStr)`

- **`objList`** (`Array`): Array of objects to search through.
- **`queryStr`** (`String`): Query string following the syntax described above.
- **Returns** (`Array`): Array of matching objects with the instance's options applied.

## Performance Tips

- For large datasets, consider disabling `allowNumericString` if you don't need string-to-number conversion.
- Set `matchChildKeysAsValues: false` (default) unless you specifically need to match object keys as values.
- Use `excludeKeys` to skip searching in fields that are never relevant to your searches.
- For repeated searches with the same options, create a `SearchEngine` instance instead of using the static method.

## Examples and Advanced Usage

For a comprehensive set of usage examples covering all search engine features, refer to our test suite:

[View Test Examples](test/index.test.js)

The test file includes examples of:
- Complex nested property searching
- Array item searching
- Logical grouping with parentheses
- De Morgan's law transformations
- Complex boolean expressions
- Excluded keys functionality
- Range searches with various configurations
- Quoted values with special characters
- Edge cases and error handling

These examples serve as excellent reference implementations when building advanced search queries.

## Author

Created by Emerson Capuchi Romaneli (@ECRomaneli).

## License

This project is licensed under the MIT License.