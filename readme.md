# Duplet

Watch two folders and keep them synchronized.

This script merges the contents of two folders by comparing the modification times of their files. Newer files will completely overwrite older files in the same position. Deletions are also mirrored if Duplet is watching. *Use with caution.*

## Installation

```npm install duplet```

## Usage

```
var duplet = require('duplet')
duplet('folder-a', 'folder-b')
```

### Ignoring Files

Ignore files matching regexp.

```
duplet('folder-a', 'folder-b', /\.meta$/)
```

Regexp is tested against the *whole path*, not just the file name.