Powered by [lunr](https://lunrjs.com/)

#### Wildcards
- **`foo*`** - words beginning with `foo` 
- **`*oo`** - words ending with `oo`

#### Term presence
* **`foo bar`** - either `foo` or `bar`
* **`+foo bar`** - `foo` must be present. `bar` optional
* **`foo -bar`** - `foo` optional `bar` shouldn't be present

#### Fuzzy matches
* **`foo~1`** - words within 1 edit distance of `foo`, like `boo`

#### Fields
* **`title:test`** - search for `test` only in document titles