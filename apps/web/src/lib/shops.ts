// Shared by the storefront, the shop owner's dashboard and the admin shop list.
// Shapes mirror the JSON from apps/api/src/shops.ts, which stays the authority.
import { eventsApi } from './site'

export const SHOP_TOKEN_KEY = 'prebook-shop-token'

export const themes = {
  teal: { label: 'PreBooking teal', accent: '#176f72', hover: '#12595b', wash: '#edf5f0', text: '#105b58' },
  green: { label: 'Leaf green', accent: '#1f6b3a', hover: '#18552e', wash: '#eef6ef', text: '#1a5a31' },
  saffron: { label: 'Saffron', accent: '#b4530a', hover: '#924308', wash: '#fdf3e9', text: '#8f4208' },
  maroon: { label: 'Maroon', accent: '#8a1c2b', hover: '#701622', wash: '#fbeef0', text: '#7a1826' },
  indigo: { label: 'Indigo', accent: '#3a3f9e', hover: '#2f3383', wash: '#eff0fb', text: '#30358a' },
} as const
export type Theme = keyof typeof themes

/** CSS variables that re-colour shadcn buttons and the shop's accents. */
export const themeStyle = (theme: Theme) => {
  const t = themes[theme] ?? themes.teal
  return { '--accent': t.accent, '--accent-hover': t.hover, '--accent-wash': t.wash, '--accent-text': t.text } as React.CSSProperties
}

export type Banner = { image: string; title: string; subtitle: string }
export type Faq = { question: string; answer: string }

export type Shop = {
  slug: string
  name: string
  tagline: string
  theme: Theme
  logo: string | null
  banners: Banner[]
  faqs: Faq[]
}

/** Admin-only view: owner contact never reaches the storefront. */
export type AdminShop = Shop & {
  id: number
  owner_name: string
  owner_phone: string
  active: boolean
  products: number
  created_at: string
}

export type ComboItem = { id: number; qty: number }

export type Product = {
  id: number
  kind: 'product' | 'combo'
  name: string
  category: string
  description: string
  size: string
  price_paise: number
  mrp_paise: number | null
  image: string | null
  in_stock: boolean
  sort: number
  items: ComboItem[]
  created_at: string
  updated_at: string | null
}

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

/** What the buyer sends: ids and quantities only. The API prices every line itself. */
export type CartLine = { id: number; qty: number }
export type OrderInput = { name: string; phone: string; address: string; note: string; items: CartLine[]; ref?: string }

export const orderStatuses = { new: 'New', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' } as const
export type OrderStatus = keyof typeof orderStatuses

/** Lines are a snapshot taken at checkout, so later price edits don't rewrite old orders. */
export type OrderLine = { id: number; kind: Product['kind']; name: string; size: string; qty: number; price_paise: number }

export type Order = {
  id: number
  customer_name: string
  customer_phone: string
  address: string
  note: string
  items: OrderLine[]
  total_paise: number
  payment_method: 'cod'
  payment_status: 'pending' | 'paid'
  status: OrderStatus
  created_at: string
  updated_at: string | null
  /** Name of the affiliate whose link brought the order, and their commission fixed at checkout. */
  affiliate: string | null
  commission_paise: number
}

// --- Shop affiliates (apps/api/src/partners.ts, owner side in shops.ts) ---

export const AFFILIATE_TOKEN_KEY = 'prebook-affiliate-token'
export const affiliatePath = '/affiliate'
export const affiliateStatuses = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Not approved' } as const
export type AffiliateStatus = keyof typeof affiliateStatuses

/** Orders, sales and commission through one affiliate's links at one shop; cancelled orders don't count. */
export type AffiliateStats = { orders: number; sales_paise: number; earned_paise: number; pending_paise: number }

/** The owner's view of an affiliate who applied to their shop. */
export type ShopAffiliate = AffiliateStats & { id: number; name: string; phone: string; code: string; status: AffiliateStatus; applied_at: string }

/** GET /partner/dashboard. Products are listed only for shops that approved the affiliate. */
export type AffiliateDashboard = {
  affiliate: { name: string; phone: string; code: string }
  shops: (AffiliateStats & {
    slug: string
    name: string
    theme: Theme
    logo: string | null
    commission_percent: number
    status: AffiliateStatus
    applied_at: string
    products: Pick<Product, 'id' | 'kind' | 'name' | 'size' | 'price_paise' | 'image' | 'in_stock'>[]
  })[]
  orders: { id: number; shop: string; total_paise: number; commission_paise: number; status: OrderStatus; created_at: string }[]
}

/** The link an affiliate shares; the storefront keeps the ref for 30 days and sends it with the order. */
export const affiliateLink = (origin: string, slug: string, code: string, productId?: number) =>
  `${origin}${shopPath(slug)}?ref=${code}${productId ? `#p-${productId}` : ''}`

export const shopsPath = '/shops'
export const shopPath = (slug: string) => `/shops/${slug}`
export const imageUrl = (key: string) => `${eventsApi}/images/${key}`

/** Same rule the API applies, so forms show the slug that will be saved. */
export const shopSlug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

const wholeRupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
/** ₹1,245 for whole rupees, ₹245.50 otherwise. */
export const formatRupees = (paise: number) => (paise % 100 ? rupees : wholeRupees).format(paise / 100)

/** "245", "245.5", "₹1,245.50" → paise. Parsed as text so no float ever touches money. */
export function parseRupees(text: string): number | null {
  const match = text.replace(/[₹,\s]/g, '').match(/^(\d{1,7})(?:\.(\d{1,2}))?$/)
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

export const toRupeeInput = (paise: number) =>
  paise % 100 ? `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}` : String(paise / 100)

/** What a combo's items would cost bought separately, and how much the combo saves. */
export function comboSavings(combo: Product, products: Product[]) {
  const byId = new Map(products.map((p) => [p.id, p]))
  const separate = combo.items.reduce((sum, item) => sum + (byId.get(item.id)?.price_paise ?? 0) * item.qty, 0)
  return { separate, saving: Math.max(0, separate - combo.price_paise) }
}

export const discountPercent = (price: number, mrp: number | null) =>
  mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0

// Suggestions only (datalists); owners can type their own.
export const categorySuggestions = ['Oils', 'Ghee', 'Rice', 'Pulses & dals', 'Flours', 'Spices & masalas', 'Sugar & jaggery', 'Dry fruits', 'Snacks', 'Beverages', 'Household']
export const sizeSuggestions = ['200 ml bottle', '500 ml bottle', '1 L bottle', '1 L pouch', '2 L can', '5 L can', '15 L tin', '250 g', '500 g', '1 kg', '5 kg bag', '10 kg bag', '25 kg bag']
