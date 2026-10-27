import { Banknote, PhoneCall, ShoppingBasket } from 'lucide-react'
import Link from 'next/link'
import { AddToCart, BannerCarousel, CartButton, CartProvider } from './storefront-cart'
import { affiliatePath, comboSavings, discountPercent, type Faq, formatRupees, imageUrl, type Product, type Shop, shopPath, shopSlug, themeStyle } from '@/lib/shops'

const OTHER = 'More products'

/** Categories in first-seen order; products with no category go last. */
function groupByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>()
  for (const product of products) {
    const name = product.category.trim() || OTHER
    groups.set(name, [...(groups.get(name) ?? []), product])
  }
  const other = groups.get(OTHER)
  groups.delete(OTHER)
  return [...groups, ...(other ? [[OTHER, other] as const] : [])].map(([name, items], index) => ({
    name,
    items,
    id: `cat-${shopSlug(name) || index}`,
  }))
}

function Logo({ shop }: { shop: Shop }) {
  return shop.logo ? (
    <img className="store-logo" src={imageUrl(shop.logo)} alt="" width={56} height={56} />
  ) : (
    <span className="store-logo" aria-hidden="true">{shop.name.trim().charAt(0).toUpperCase()}</span>
  )
}

/** /shops: every active shop, each card in its own theme colour. */
export function ShopsDirectory({ shops }: { shops: Shop[] }) {
  return (
    <div className="store">
      <header className="store-header">
        <div className="container store-header-inner">
          <div className="store-title">
            <h1>Shops</h1>
            <p>Local shops on PreBooking</p>
          </div>
          <Link className="store-platform" href="/">PreBooking home</Link>
        </div>
      </header>
      <main className="container store-body">
        {shops.length === 0 ? (
          <p className="store-empty">Shops are coming soon.</p>
        ) : (
          <ul className="store-directory">
            {shops.map((shop) => (
              <li key={shop.slug} style={themeStyle(shop.theme)}>
                <Link href={shopPath(shop.slug)}>
                  <Logo shop={shop} />
                  <span>
                    <strong>{shop.name}</strong>
                    {shop.tagline && <span>{shop.tagline}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="store-footer">
        <div className="container">
          <strong>PreBooking</strong>
          <span className="store-footer-links">
            <Link href="/">Back to PreBooking</Link>
            <a href="https://zenyne.com" target="_blank" rel="noopener noreferrer">
              Made with care by Zenyne Labs
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}

function Picture({ product, size }: { product: Product; size: number }) {
  return (
    <div className="store-picture">
      {product.image ? (
        <img src={imageUrl(product.image)} alt={product.name} width={size} height={size} loading="lazy" />
      ) : (
        <span aria-hidden="true">{product.name.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

function Price({ product }: { product: Product }) {
  const off = discountPercent(product.price_paise, product.mrp_paise)
  return (
    <p className="store-price">
      <strong>{formatRupees(product.price_paise)}</strong>
      {off > 0 && product.mrp_paise !== null && (
        <>
          <s>
            <span className="sr-only">MRP </span>
            {formatRupees(product.mrp_paise)}
          </s>
          <span className="store-off">{off}% off</span>
        </>
      )}
    </p>
  )
}


/** Shown under the shop's own FAQs; true for every shop because ordering works the same everywhere. */
const orderingFaqs = (shop: string): Faq[] => [
  {
    question: 'How do I place an order?',
    answer: `Add products to your cart, open the cart and enter your name, mobile number and delivery address. Your order goes straight to ${shop}.`,
  },
  { question: 'How do I pay?', answer: 'Cash on delivery. Pay when your order reaches you; there is no online payment.' },
  {
    question: 'When is my order confirmed?',
    answer: `${shop} calls the mobile number you give to confirm the items, the delivery time and any delivery charge.`,
  },
  { question: 'Can I change or cancel my order?', answer: 'Yes. Tell the shop when they call to confirm, before your order is sent out.' },
]

const steps = [
  { Icon: ShoppingBasket, title: 'Fill your cart', text: 'Pick products and combos, and choose how many of each.' },
  { Icon: PhoneCall, title: 'The shop calls you', text: 'Share your address at checkout. The shop calls to confirm the order and delivery.' },
  { Icon: Banknote, title: 'Pay on delivery', text: 'Pay in cash when your order arrives at your door.' },
]

function Hero({ shop, products, firstSection }: { shop: Shop; products: Product[]; firstSection?: string }) {
  const pictures = products.filter((product) => product.image).slice(0, 3)
  return (
    <section className="container store-hero" aria-labelledby="store-hero-title">
      <div className="store-hero-copy">
        <h2 id="store-hero-title">{shop.tagline || `Order from ${shop.name} online`}</h2>
        <p>Add what you need, place your order and pay in cash when it arrives.</p>
        {firstSection && (
          <a className="store-hero-cta" href={`#${firstSection}`}>
            Start shopping
          </a>
        )}
      </div>
      {pictures.length > 0 && (
        <ul className="store-hero-pictures" data-count={pictures.length} aria-hidden="true">
          {pictures.map((product) => (
            <li key={product.id}>
              <img src={imageUrl(product.image!)} alt="" width={360} height={360} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Storefront({ shop, products }: { shop: Shop; products: Product[] }) {
  const combos = products.filter((product) => product.kind === 'combo')
  const groups = groupByCategory(products.filter((product) => product.kind === 'product'))
  const sections = [...(combos.length ? [{ id: 'combos', name: 'Combos' }] : []), ...groups]
  const byId = new Map(products.map((product) => [product.id, product]))
  const faqs = [...(shop.faqs ?? []), ...orderingFaqs(shop.name)]

  return (
    <div className="store" style={themeStyle(shop.theme)}>
      <CartProvider shop={shop} products={products}>
        <header className="store-header">
          <div className="container store-header-inner">
            <Link className="store-brand" href={shopPath(shop.slug)}>
              <Logo shop={shop} />
              <span className="store-title">
                <h1>{shop.name}</h1>
                <span>on PreBooking</span>
              </span>
            </Link>
            <nav className="store-header-links" aria-label="Shop">
              <a href="#how-to-order">How to order</a>
              <a href="#faq">FAQ</a>
            </nav>
            <CartButton />
          </div>
        </header>

        <main>
          {shop.banners.length > 0 ? <BannerCarousel banners={shop.banners} /> : <Hero shop={shop} products={products} firstSection={sections[0]?.id} />}

          {sections.length > 1 && (
            <nav className="store-nav" aria-label="Categories">
              <ul className="container">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.name}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="container store-body">
            {sections.length === 0 && <p className="store-empty">Products are coming soon.</p>}

            {combos.length > 0 && (
              <section id="combos" className="store-section" aria-labelledby="combos-title">
                <h2 id="combos-title">Combos</h2>
                <ul className="store-combos">
                  {combos.map((combo) => {
                    const includes = combo.items.flatMap(({ id, qty }) => {
                      const item = byId.get(id)
                      return item ? [`${qty} × ${item.name}${item.size ? ` ${item.size}` : ''}`] : []
                    })
                    const { saving } = comboSavings(combo, products)
                    return (
                      <li key={combo.id} id={`p-${combo.id}`} className="store-combo" data-stock={combo.in_stock ? 'in' : 'out'}>
                        <Picture product={combo} size={400} />
                        <div className="store-combo-info">
                          <h3>{combo.name}</h3>
                          <Price product={combo} />
                          {includes.length > 0 && <p className="store-includes">Includes {includes.join(', ')}</p>}
                          {saving > 0 && <p className="store-saving">Saves {formatRupees(saving)} vs buying separately</p>}
                          <AddToCart product={combo} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {groups.map((group) => (
              <section key={group.id} id={group.id} className="store-section" aria-labelledby={`${group.id}-title`}>
                <h2 id={`${group.id}-title`}>
                  {group.name} <span>{group.items.length}</span>
                </h2>
                <ul className="store-grid">
                  {group.items.map((product) => (
                    <li key={product.id} id={`p-${product.id}`} className="store-product" data-stock={product.in_stock ? 'in' : 'out'}>
                      <Picture product={product} size={400} />
                      <h3>{product.name}</h3>
                      {product.size && <p className="store-size">{product.size}</p>}
                      {product.description && <p className="store-description">{product.description}</p>}
                      <Price product={product} />
                      <AddToCart product={product} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section id="how-to-order" className="store-steps" aria-labelledby="how-to-order-title">
            <div className="container">
              <h2 id="how-to-order-title">How to order</h2>
              <ol>
                {steps.map(({ Icon, title, text }) => (
                  <li key={title}>
                    <Icon aria-hidden="true" />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="faq" className="container store-faq" aria-labelledby="faq-title">
            <h2 id="faq-title">Questions</h2>
            <div>
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </main>

        <footer className="store-footer">
          <div className="container store-footer-top">
            <div>
              <strong>{shop.name}</strong>
              {shop.tagline && <p>{shop.tagline}</p>}
              <p>Cash on delivery</p>
            </div>
            {sections.length > 0 && (
              <nav aria-label="Footer">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    {section.name}
                  </a>
                ))}
              </nav>
            )}
          </div>
          <div className="container store-footer-bottom">
            <span className="store-footer-links">
              <Link href="/shops">More shops on PreBooking</Link>
              <Link href={`${affiliatePath}?shop=${shop.slug}`}>Become an affiliate</Link>
            </span>
            <a href="https://zenyne.com" target="_blank" rel="noopener noreferrer">
              Made with care by Zenyne Labs
            </a>
          </div>
        </footer>
      </CartProvider>
    </div>
  )
}
