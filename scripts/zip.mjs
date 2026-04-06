import { createWriteStream, readFileSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, relative } from 'path'
import { createGzip } from 'zlib'

// Utilise le module natif Node.js 18+ pour créer un zip sans dépendance
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const zipName = `wow-token-extension-v${pkg.version}.zip`
const zipPath = join(root, zipName)

execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' })
console.log(`\n✓ Prêt pour le Chrome Web Store : ${zipName}`)
