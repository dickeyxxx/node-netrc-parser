import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'path'

import {Netrc} from '../src/netrc'

fs.mkdirpSync('tmp')

process.env.NETRC_PARSER_DEBUG = '1'

const skipOnWindows = process.platform === 'win32' ? it.skip : it

describe('netrc', () => {
  it('can read system netrc', () => {
    let netrc = new Netrc()
    netrc.loadSync()
    expect(!!netrc.machines).to.be.true
  })

  it('can read system netrc async', async () => {
    let netrc = new Netrc()
    await netrc.load()
    expect(!!netrc.machines).to.be.true
  })

  it('reads basic', () => {
    const f = 'tmp/netrc'
    fs.writeFileSync(
      f,
      `machine mail.google.com # foo
  login joe@gmail.com
  account gmail
  password somethingSecret
machine ray login demo password mypassword`,
    )
    const netrc = new Netrc(f)
    netrc.loadSync()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('gmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')

    expect(netrc.machines.ray.login).to.equal('demo')
    expect(netrc.machines.ray.password).to.equal('mypassword')
  })

  it('can read netrc via NETRC env var', async () => {
    const originalNetrcEnv = process.env.NETRC
    process.env.NETRC = path.resolve(__dirname, '../tmp/.netrc')
    let netrc = new Netrc()
    await netrc.load()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('gmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')

    expect(netrc.machines.ray.login).to.equal('demo')
    expect(netrc.machines.ray.password).to.equal('mypassword')
    process.env.NETRC = originalNetrcEnv
  })

  it('bad default order', () => {
    const f = 'tmp/netrc'
    fs.writeFileSync(
      f,
      `# I am a comment
machine mail.google.com
  login joe@gmail.com
  account gmail
  password somethingSecret
# I am another comment

default
  login anonymous
  password joe@example.com

machine ray login demo password mypassword
  `,
    )
    const netrc = new Netrc(f)
    netrc.loadSync()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('gmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')

    expect(netrc.machines.ray.login).to.equal('demo')
    expect(netrc.machines.ray.password).to.equal('mypassword')
  })

  it('it loads the netrc file with comments', () => {
    const f = 'tmp/netrc'
    fs.writeFileSync(
      f,
      `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey`)
    const netrc = new Netrc(f)
    netrc.loadSync()

    expect(netrc.machines['api.dickeyxxx.com'].login).to.equal('jeff@foo.com')
    expect(netrc.machines['api.dickeyxxx.com'].password).to.equal('myapikey')
  })

  it('good', () => {
    const f = 'tmp/netrc'
    fs.writeFileSync(
      f,
      `# I am a comment
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
`,
    )
    const netrc = new Netrc(f)
    netrc.loadSync()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('justagmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')
  })

  const gpgEncrypted = `-----BEGIN PGP MESSAGE-----
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
-----END PGP MESSAGE-----`

  skipOnWindows('good.gpg sync', () => {
    const f = 'tmp/netrc.gpg'
    fs.writeFileSync(f, gpgEncrypted)
    const netrc = new Netrc(f)
    netrc.loadSync()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('justagmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')

    netrc.saveSync()
    expect(fs.readFileSync(f, {encoding: 'utf8'})).to.contain('-----BEGIN PGP MESSAGE-----')
  })

  skipOnWindows('good.gpg', async () => {
    const f = 'tmp/netrc.gpg'
    await fs.writeFile(f, gpgEncrypted)
    const netrc = new Netrc(f)
    await netrc.load()

    expect(netrc.machines['mail.google.com'].login).to.equal('joe@gmail.com')
    expect(netrc.machines['mail.google.com'].account).to.equal('justagmail')
    expect(netrc.machines['mail.google.com'].password).to.equal('somethingSecret')

    await netrc.save()
    expect(fs.readFileSync(f, {encoding: 'utf8'})).to.contain('-----BEGIN PGP MESSAGE-----')
  })

  it('saving', () => {
    const f = 'tmp/netrc'
    fs.writeFileSync(
      f,
      `# I am a comment
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
`,
  )
    const netrc = new Netrc(f)
    netrc.loadSync()
    netrc.machines['mail.google.com'].login = 'joe2@gmail.com'
    netrc.machines['mail.google.com'].account = 'justanaccount'
    netrc.machines.ray.login = 'demo2'
    netrc.machines.ray.account = 'newaccount'
    netrc.machines.new = {login: 'myuser', password: 'mypass'}
    netrc.machines.anothernew = {}
    netrc.machines.anothernew = {login: 'myuser'}
    netrc.saveSync()

    expect(fs.readFileSync(f, 'utf8')).to.equal(`# I am a comment
machine mail.google.com
  login joe2@gmail.com
  password somethingSecret #end of line comment with trailing space
  account justanaccount
 # I am another comment

macdef allput
put src/*

macdef allput2
  put src/*
put src2/*

machine ray login demo2 password mypassword account newaccount
machine weirdlogin login uname password pass #pass

default
  login anonymous
  password joe@example.com
machine new login myuser password mypass
machine anothernew login myuser
`)
})

  it('adding a machine should create a new entry', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines['foo.bar.com'] = {login: 'foo@bar.com', password: 'foopassword'}
    await netrc.save()

    const afterSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey
machine foo.bar.com
  login foo@bar.com
  password foopassword\n`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('edit host', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine a
  login jeff@foo.com
  password myapikey
`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.a.host = 'b'
    await netrc.save()

    const afterSave = `machine b
  login jeff@foo.com
  password myapikey\n`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('edit existing machine', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey
machine b
\tlogin jeff@bar.com
\tpassword myapikey2`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines['api.dickeyxxx.com'] = {login: 'foo@bar.com', password: 'foopassword'}
    netrc.machines.b.login = 'foobar'
    await netrc.save()

    const afterSave = `machine api.dickeyxxx.com # foo
  login foo@bar.com
  password foopassword
machine b
\tlogin foobar
\tpassword myapikey2\n`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('removing a machine', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey
machine foo.bar.com
  password foopassword
  login foo@bar.com
`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    delete netrc.machines['api.dickeyxxx.com']
    await netrc.save()

    const afterSave = `machine foo.bar.com
  login foo@bar.com
  password foopassword
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('setting machine to undefined', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine api.dickeyxxx.com # foo
  login jeff@foo.com
  password myapikey
machine foo.bar.com
  password foopassword
  login foo@bar.com
`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines['api.dickeyxxx.com'] = undefined as any
    await netrc.save()

    const afterSave = `machine foo.bar.com
  login foo@bar.com
  password foopassword
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('empty netrc', async () => {
    const f = 'tmp/netrc'

    const beforeSave = ''

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines['api.dickeyxxx.com'] = {login: 'foo', password: 'bar'}
    netrc.machines['foo.dickeyxxx.com'] = {login: 'foo2', password: 'bar2'}
    await netrc.save()

    const afterSave = `machine api.dickeyxxx.com login foo password bar
machine foo.dickeyxxx.com login foo2 password bar2
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('netrc with nothing useful', async () => {
    const f = 'tmp/netrc'

    const beforeSave = 'foobar\n'

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines['api.dickeyxxx.com'] = {login: 'foo', password: 'bar'}
    netrc.machines['foo.dickeyxxx.com'] = {login: 'foo2', password: 'bar2'}
    await netrc.save()

    const afterSave = `foobar
machine api.dickeyxxx.com login foo password bar
machine foo.dickeyxxx.com login foo2 password bar2
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('netrc with duplicate entries', async () => {
    const f = 'tmp/netrc'

    const beforeSave = `machine a
  login foo
  password bar
machine b
  login foo2
  password bar2
machine a
  login ignoreme
  password ignoreme
`

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    await netrc.save()

    const afterSave = `machine a
  login foo
  password bar
machine b
  login foo2
  password bar2
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
})

  it('set existing', async () => {
    const f = 'tmp/netrc'

    const beforeSave = 'machine a password p login u'

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.a = {login: 'foo', password: 'bar'}
    await netrc.save()

    const afterSave = 'machine a login foo password bar\n'

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('set new prop', async () => {
    const f = 'tmp/netrc'

    const beforeSave = 'machine foo password p login u'

    fs.writeFileSync(f, beforeSave)

    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.foo.login = 'uu'
    netrc.machines.foo.account = 'bar'
    netrc.machines.foo.password = undefined
    expect('foo' in netrc.machines).to.equal(true)
    expect('bar' in netrc.machines).to.equal(false)
    delete netrc.machines.bar
    await netrc.save()

    const afterSave = `machine foo login uu account bar
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('only login', async () => {
    const f = 'tmp/netrc'
    const beforeSave = 'machine u login foo password pass'
    fs.writeFileSync(f, beforeSave)
    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.foo = {login: 'uu'}
    netrc.saveSync()

    const afterSave = `machine u login foo password pass
machine foo login uu
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('only password', async () => {
    const f = 'tmp/netrc'
    const beforeSave = 'machine u login foo password pass'
    fs.writeFileSync(f, beforeSave)
    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.foo = {password: 'uu'}
    netrc.saveSync()

    const afterSave = `machine u login foo password pass
machine foo password uu
`

    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('file not found', async () => {
    const f = 'tmp/netrc'
    fs.removeSync(f)
    const netrc = new Netrc(f)
    await netrc.load()
    netrc.machines.foo = {login: 'u', password: 'p'}
    await netrc.save()
    const afterSave = 'machine foo login u password p\n'
    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('file not found sync', () => {
    const f = 'tmp/netrc'
    fs.removeSync(f)
    const netrc = new Netrc(f)
    netrc.loadSync()
    netrc.machines.foo = {login: 'u', password: 'p'}
    netrc.saveSync()
    const afterSave = 'machine foo login u password p\n'
    expect(fs.readFileSync(f, 'utf8')).to.equal(afterSave)
  })

  it('extra code coverage checks', () => {
    const netrc = new Netrc()
    netrc.loadSync()
    expect(Symbol() in netrc.machines).to.equal(false)
    netrc.machines.a = {login: 'foo'}
    expect(Symbol() in netrc.machines.a).to.equal(false)
    expect(netrc.machines.a.lwljlkwejf).to.equal(undefined)
    expect(netrc.machines.a[Symbol() as any]).to.equal(undefined)
    expect(netrc.machines[Symbol() as any]).to.equal(undefined)
    netrc.machines.b = undefined as any
  })
})
