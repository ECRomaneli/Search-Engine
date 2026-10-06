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
- Fuzzy (typo-tolerant) search with optional relevance sorting
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
  excludeKeys: ['name', 'tags'],
  allowNumericString: false,
  allowKeyValueMatching: true,
  matchChildKeysAsValues: false,
  maxLevels: 5
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
| `maxLevels`              | `number`   | unlimited | Maximum levels of nested objects to search through. Useful to avoid infinite loops in deeply nested or circular data. |
| `fuzzy`                  | `boolean \| object` | `false` | Enables typo-tolerant matching of string values. See [Fuzzy Search](#fuzzy-search). |

### Notes
- The `maxLevels` option can be set to limit how deep the search will go into nested objects. This is especially useful for large or circular data structures.

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

## Fuzzy Search

Fuzzy search is disabled by default. Set `fuzzy: true` to enable it with the default settings, or pass an object to customize it:

```javascript
SearchEngine.search(users, 'name: jhon', { fuzzy: true })
// => [{ id: 1, name: 'John Doe', ... }, { id: 3, name: 'Bob Johnson', ... }]

const engine = new SearchEngine({
  fuzzy: {
    algorithm: 'damerau',
    tolerance: 0.25,
    maxDistance: 2,
    minLength: 3,
    sort: true
  }
})

engine.search(users, 'name: jonh or tags: desinger')
```

| Option        | Type     | Default     | Description                                                                                                    |
|---------------|----------|-------------|----------------------------------------------------------------------------------------------------------------|
| `algorithm`   | `string` | `'damerau'` | Algorithm used to compare the terms with the values. See the list below.                                       |
| `tolerance`   | `number` | `0.25`      | Fraction (0 to 1) of the term length that can be edited. E.g. `0.25` allows 1 edit for terms with 4 to 7 characters. |
| `maxDistance` | `number` | unlimited   | Maximum number of edits allowed regardless of the term length.                                                 |
| `minLength`   | `number` | `3`         | Terms shorter than this are matched exactly.                                                                   |
| `sort`        | `boolean`| `false`     | Sorts the results by relevance (closest matches first). Ties keep the original order.                          |

### Algorithms

- **`damerau`**: Finds the term inside the value allowing insertions, deletions, substitutions and swaps of adjacent characters (each counts as 1 edit). Best for typos (`jhon` → `John`).
- **`levenshtein`**: Same as `damerau`, but swapping two characters counts as 2 edits.
- **`subsequence`**: The characters of the term must appear in the value in the same order, gaps allowed (`jsmth` → `John Smith`). Best for abbreviations. `tolerance` and `maxDistance` are ignored.

The number of allowed edits is `min(maxDistance, floor(term length × tolerance))`.

### Scope

- Only plain value matches (`field: value`, `"value"` and bare terms like `jhon`) are fuzzy.
- Field names, regex (`*:`), range (`~:`) and `is` / `is not` queries are always exact.
- Values of type `number` are always exact (`age: 31` does not match `30`), while numeric strings are fuzzy (`zip: 10002` matches `"10001"`).
- Exact matches are always checked first, so they are not slowed down.

### Relevance Sorting

When `sort` is `true`, each condition that is not negated adds a score from 0 to 1 to the object (1 for an exact match, less for each edit or gap). Objects are sorted by their total score, so objects that match more conditions, or match them more closely, come first.

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

### "Is / Is Not" Operators

- `field is value` - Search for objects where `field` is exactly `value`.
- `field is not value` - Search for objects where `field` is not `value`.

Where `value` must be one of the following:
- A boolean (`true` or `false`)
- `null`
- `undefined` (or `undef`)
- `blank` (empty strings)
- `empty` (empty arrays)

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
- Limit `maxLevels` if you have deeply nested data to avoid performance issues.
- Fuzzy search only runs when an exact match fails, but it may still make searches noticeably slower on large datasets. Use `minLength` and `maxDistance` to limit its cost, and enable `sort` only when needed.

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