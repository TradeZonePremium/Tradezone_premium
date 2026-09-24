import RegisterFlow from "@/components/RegisterFlow";
import { CandleStrip, Header } from "@/components/Brand";

export default function Home() {
  return (
    <>
      <Header right={<a href="/renew" className="toplink">Renew</a>} />

      <main className="shell hero">
        <section className="pitch">
          <h1>Get into the Trade Zone Premium group</h1>

          <p className="lead">
            Pick a plan, verify your email and pay securely with Razorpay. Your personal group link arrives by email as
            soon as the payment clears.
          </p>

          <CandleStrip />

          <ol className="steps">
            <li>
              <b>Verify your email</b>
              <span>We send a one-time code. No password needed.</span>
            </li>

            <li>
              <b>Pay with UPI, card or netbanking</b>
              <span>Your plan starts the moment the payment is confirmed.</span>
            </li>

            <li>
              <b>Open the link in your email</b>
              <span>Send a join request in WhatsApp. The admin approves active members.</span>
            </li>
          </ol>
        </section>

        <RegisterFlow />

        <footer className="legal-name">
          <strong>Legal Business Name: NATHVANI ROHAN VINODBHAI</strong>
          <span>Brand Name: Trade Zone Premium</span>
        </footer>
      </main>
    </>
  );
}
