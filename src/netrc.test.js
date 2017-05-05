// @flow
/* globals
   test
   expect
*/

const fs = require('fs-extra')
const Netrc = require('./netrc')

fs.mkdirpSync('tmp')

test('can read system netrc', () => {
  let netrc = new Netrc()
  expect(netrc.machines).toBeTruthy()
})

test('bad default order', () => {
  const f = `tmp/netrc`
  fs.writeFileSync(f, `# I am a comment
    machine mail.google.com
      login joe@gmail.com
      account gmail
      password somethingSecret
    # I am another comment

    default
      login anonymous
      password joe@example.com

    machine ray login demo password mypassword
`)
  const netrc = new Netrc(f)

  expect(netrc.machines['mail.google.com']).toMatchObject({
    login: 'joe@gmail.com',
    account: 'gmail',
    password: 'somethingSecret'
  })

  expect(netrc.machines['ray']).toMatchObject({
    login: 'demo',
    password: 'mypassword'
  })
})

test('it loads the netrc file with comments', () => {
  const f = `tmp/netrc`
  fs.writeFileSync(f, `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey`)
  const netrc = new Netrc(f)

  expect(netrc.machines['api.dickeyxxx.com']).toMatchObject({
    login: 'jeff@foo.com',
    password: 'myapikey'
  })
})

test('default only', () => {
  const f = `tmp/netrc`
  fs.writeFileSync(f, `# this is my netrc with only a default
default
  login ld # this is my default username
  password pdcom
  password myapikey`)
  const netrc = new Netrc(f)

  expect(netrc.default).toMatchObject({
    login: 'ld',
    password: 'myapikey'
  })
})

test('good', () => {
  const f = `tmp/netrc`
  fs.writeFileSync(f, `# I am a comment
machine mail.google.com
\tlogin joe@gmail.com
  account justagmail #end of line comment with trailing space
  password somethingSecret
 # I am another comment

macdef allput
put src/*

macdef allput2
  put src/*
put src2/*

machine ray login demo password mypassword

machine weirdlogin login uname password pass#pass

default
  login anonymous
  password joe@example.com
`)
  const netrc = new Netrc(f)

  expect(netrc.machines['mail.google.com']).toMatchObject({
    login: 'joe@gmail.com',
    account: 'justagmail',
    password: 'somethingSecret'
  })
})

test('good.gpg', () => {
  const f = `tmp/netrc.gpg`
  fs.writeFileSync(f, `-----BEGIN PGP MESSAGE-----
Version: GnuPG v2

hIwD1rghrTHCzmIBA/9JIhd9NaY64C7QMIOa8KV/e97Hs9he6EAHdhDUMeb6/5HU
KaxHX77rHjF0TxNUumQrMTfp+EjKzjuDqTxrv0TnpqB8JYhwLqVCGPM+OvjNlILy
/EdDpkqEaKqM4KArRQjE4n8ifAi5CbldI/mO+oBvHTq5StJDNEhE+xMjRzGJ29LA
VQEWWdR291Z8Y0cbZwX2DmGsPuo6tX0JeWQlG9ms8966wVk2LKFuUyynHBVjcsjv
REKnai8ZixhaKRBE/NOiLo/Eqp6nI7/i8YU+mYV0rFljpLSnQ7LJcgw3ItyKXQ9F
ws16ShzCIGM11JFySwb0NoV6H9VSakfu2LN1RpKFD2lvc6i75N0NWf0Jh/mKHFz+
ugLe8sik/Zu8grrxtOVxfgtjFEQvjT3u02D4pDQP1lNp7SjVfqUC+XnxWQC+SQVC
kKvydwB3oZqwHp6jpgLVTxjTfhm1vNTB7gAbgNOF63yQ/Wmrn3Pe38huh+TIKJCy
pQgBLBordnqQajWt1ao+8AZiAsOooF0wJqm/mH1Og5/ADuhvZEQ=
=PGaL
-----END PGP MESSAGE-----`)
  const netrc = new Netrc(f)

  expect(netrc.machines['mail.google.com']).toMatchObject({
    login: 'joe@gmail.com',
    account: 'justagmail',
    password: 'somethingSecret'
  })
})

test('invalid', () => {
  expect.assertions(1)
  const f = `tmp/netrc`
  fs.writeFileSync(f, 'machine')
  try {
    let netrc = new Netrc(f)
    expect(netrc).toBeNull()
  } catch (err) { expect(err.message).toContain('Unexpected character during netrc parsing') }
})

test('saving', () => {
  const f = `tmp/netrc`
  fs.writeFileSync(f, `# I am a comment
machine mail.google.com
\tlogin joe@gmail.com
  password somethingSecret #end of line comment with trailing space
 # I am another comment

macdef allput
put src/*

macdef allput2
  put src/*
put src2/*

machine ray login demo password mypassword

machine weirdlogin login uname password pass#pass

default
  login anonymous
  password joe@example.com
`)
  const netrc = new Netrc(f)
  netrc.machines['mail.google.com'].login = 'joe2@gmail.com'
  netrc.machines['mail.google.com'].account = 'justanaccount'
  netrc.machines['ray'].login = 'demo2'
  netrc.machines['ray'].account = 'newaccount'
  netrc.machines['new'].login = 'myuser'
  netrc.machines['new'].password = 'mypass'
  netrc.save()

  expect(fs.readFileSync(f, 'utf8')).toEqual(`# I am a comment
machine mail.google.com
\taccount justanaccount
\tlogin joe2@gmail.com
  password somethingSecret #end of line comment with trailing space
 # I am another comment

macdef allput
put src/*

macdef allput2
  put src/*
put src2/*

machine ray account newaccount login demo2 password mypassword

machine weirdlogin login uname password pass#pass

default
  login anonymous
  password joe@example.com
machine new
  password mypass
  login myuser
`)
})

test('adding a machine should create a new entry', () => {
  const f = `tmp/netrc`

  const beforeSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey`

  fs.writeFileSync(f, beforeSave)

  const netrc = new Netrc(f)
  netrc.machines['foo.bar.com'].login = 'foo@bar.com'
  netrc.machines['foo.bar.com'].password = 'foopassword'
  netrc.save()

  const afterSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey
machine foo.bar.com
  password foopassword
  login foo@bar.com\n`

  expect(fs.readFileSync(f, 'utf8')).toEqual(afterSave)
})
