import { Link } from 'react-router-dom'
import { ArrowLeft, Bot } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary lift-on-hover mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <span className="font-display font-bold text-lg">Aiventre</span>
        </div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-muted leading-relaxed text-[15px]">
          <p>Last updated: September 2026</p>
          <p>
            Aiventre ("we", "us") is an AI sales assistant for manufacturing job shops. This policy explains what
            information the service handles, how it is used, and the choices you have.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">What we handle</h2>
          <p>
            Your shop profile (machines, capabilities, contact details), the buyer companies you or the AI agent add
            to your list, email drafts, replies you paste in, and drawings you upload for quoting. Buyer details are
            limited to business information the company has published itself, such as a website, a general or
            purchase email address and an office phone number, together with the page where it was found. We do not
            buy contact lists.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Where it is stored</h2>
          <p>
            During the pilot, your data is saved in your own browser on your device. It is not stored on our
            servers. You can download a backup or clear it at any time.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">AI processing</h2>
          <p>
            When you use an AI feature, the relevant information (for example your shop profile and the text or
            drawing you submitted) is sent through our server to our AI provider, Anthropic, to generate the result.
            It is used only to provide that result. The AI agent also searches the public web to find companies.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">What we don't do</h2>
          <p>
            We do not sell your data, and Aiventre never sends emails or makes calls on your behalf — you review and
            send everything yourself.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Contact</h2>
          <p>
            Questions about this policy can be sent to{' '}
            <a href="mailto:hello@aiventre.com" className="text-primary hover:underline">hello@aiventre.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
