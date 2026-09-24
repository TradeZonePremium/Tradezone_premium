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
            Pick a plan, verify your email and pay securely with Razorpay.
            Your personal group link arrives by email as soon as the payment clears.
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
              <span>
                Send a join request in WhatsApp. The admin approves active members.
              </span>
            </li>
          </ol>
        </section>

        <RegisterFlow />

        {/* Business Information */}
        <footer
          className="legal-name"
          style={{
            marginTop: "40px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(0, 0, 0, 0.12)",
            textAlign: "center",
            lineHeight: "1.7",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Legal Business Name
          </div>

          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              marginTop: "2px",
            }}
          >
            NATHVANI ROHAN VINODBHAI
          </div>

          <div
            style={{
              fontSize: "14px",
              marginTop: "8px",
              opacity: 0.75,
            }}
          >
            Brand Name: Trade Zone Premium
          </div>
        </footer>
      </main>
    </>
  );
}
