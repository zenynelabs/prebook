// Creates a staff login for the admin panel, or resets its password and signs it out everywhere.
//   bun run add-admin <email> "<name>"              local D1 (wrangler dev)
//   bun run add-admin <email> "<name>" --remote     production D1
//   add --no-shops for a login that can't see or open the Shops area
import { hashPassword } from '../src/auth'

const args = process.argv.slice(2)
const [email = '', name = ''] = args.filter((arg: string) => !arg.startsWith('--'))
const remote = args.includes('--remote')
const shops = args.includes('--no-shops') ? 0 : 1
const address = email.trim().toLowerCase()
if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(address) || name.trim().length < 2) {
  console.error('Usage: bun run add-admin <email> "<name>" [--remote] [--no-shops]')
  process.exit(1)
}

let typed = ''

/** Reads a line without echoing it, so the password never shows on screen. */
function hidden(label: string) {
  process.stdout.write(label)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)
  return new Promise<string>((resolve) => {
    const take = () => {
      const end = typed.search(/[\r\n]/)
      if (end < 0) return false
      const line = typed.slice(0, end)
      typed = typed.slice(end + 1).replace(/^\n/, '')
      process.stdin.off('data', onData).pause()
      if (process.stdin.isTTY) process.stdin.setRawMode(false)
      process.stdout.write('\n')
      resolve(line)
      return true
    }
    const onData = (chunk: Buffer) => {
      for (const char of String(chunk)) {
        if (char === '\u0003') process.exit(130)
        typed = char === '\u007f' ? typed.slice(0, -1) : typed + char
      }
      take()
    }
    if (!take()) process.stdin.on('data', onData).resume()
  })
}

const password = await hidden('Password (at least 10 characters): ')
if (password.length < 10) {
  console.error('Use at least 10 characters.')
  process.exit(1)
}
if ((await hidden('Repeat password: ')) !== password) {
  console.error('The passwords don’t match.')
  process.exit(1)
}

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const sql = `INSERT INTO admins (email, name, password_hash, shops)
  VALUES (${quote(address)}, ${quote(name.trim())}, ${quote(await hashPassword(password))}, ${shops})
  ON CONFLICT (email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, shops = excluded.shops;
DELETE FROM admin_sessions WHERE admin_id = (SELECT id FROM admins WHERE email = ${quote(address)});`

const { exitCode } = Bun.spawnSync(
  ['wrangler', 'd1', 'execute', 'DB', remote ? '--remote' : '--local', '--command', sql],
  { stdio: ['inherit', 'inherit', 'inherit'] },
)
if (exitCode === 0) console.log(`${address} can now sign in to the admin panel.`)
else console.error(`\nIf it says “no such table”, apply the migrations first: bun run migrate${remote ? '' : ' (or wrangler d1 migrations apply DB --local)'}`)
process.exit(exitCode)
