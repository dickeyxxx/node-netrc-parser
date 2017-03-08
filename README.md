# netrc-parser

[![CircleCI](https://circleci.com/gh/dickeyxxx/node-netrc-parser.svg?style=svg)](https://circleci.com/gh/dickeyxxx/node-netrc-parser)
[![codecov](https://codecov.io/gh/dickeyxxx/node-netrc-parser/branch/master/graph/badge.svg)](https://codecov.io/gh/dickeyxxx/node-netrc-parser)

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## Netrc

[src/netrc.js:183-281](https://github.com/dickeyxxx/node-netrc-parser/blob/c49368391130df341e9d366bfdf904c67e7931ea/src/netrc.js#L183-L281 "Source code on GitHub")

parses a netrc file

### machines

[src/netrc.js:190-190](https://github.com/dickeyxxx/node-netrc-parser/blob/c49368391130df341e9d366bfdf904c67e7931ea/src/netrc.js#L190-L190 "Source code on GitHub")

gets the machines on the home netrc file

**Examples**

```javascript
const netrc = require('netrc-parser')
netrc.machines['api.heroku.com'].password // get auth token from ~/.netrc
```

Returns **Machines** 

### save

[src/netrc.js:199-199](https://github.com/dickeyxxx/node-netrc-parser/blob/c49368391130df341e9d366bfdf904c67e7931ea/src/netrc.js#L199-L199 "Source code on GitHub")

save the current home netrc with any changes

**Examples**

```javascript
const netrc = require('netrc-parser')
netrc.machines['api.heroku.com'].password = 'newpassword'
netrc.save()
```
