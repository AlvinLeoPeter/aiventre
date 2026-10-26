import { handler, HttpError } from '../server/claude.js'
import { checkBuyers } from '../server/verify.js'

/* ----------------------------------------------------------------
   POST /api/verify  { buyers: [{ company, website, source_url, email, phone, state, gstin, cin }] }
     ->  { checks: [...] }

   Re-checks buyers the owner added by hand or the assistant saved:
   does the source page exist and name them, is the contact theirs,
   is a valid GSTIN/CIN on their site. No AI involved, so no credits.
---------------------------------------------------------------- */

const MAX = 10

export default handler(async ({ buyers }) => {
  if (!Array.isArray(buyers) || !buyers.length) throw new HttpError(400, 'Nothing to check.')
  return { checks: await checkBuyers(buyers.slice(0, MAX)) }
})
