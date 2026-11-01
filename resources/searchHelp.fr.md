Supporté par [lunr](https://lunrjs.com/)

#### Caractères génériques
- **`foo*`** - mots commençant par `foo` 
- **`*oo`** - mots finissant par `oo`

#### Présence du terme
* **`foo bar`** - soit `foo` ou `bar`
* **`+foo bar`** - `foo` doit être présent. `bar` facultatif
* **`foo -bar`** - `foo` facultatif `bar` ne doit pas être présent

#### Correspondances approximatives
* **`foo~1`** - mots à une distance de modification de `foo`, comme `boo`

#### Champs
* **`title:test`** - recherche de `test` uniquement dans les titres de document