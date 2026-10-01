import RegisterFlow from "@/components/RegisterFlow";
import { CandleStrip, Header } from "@/components/Brand";

export default function Home() {
  return (
    <>
      <Header right={<a href="/renew" className="toplink">Renew Membership</a>} />

      <main className="shell">
        <section className="education-hero">
          <div className="education-hero-copy">
            <div className="eyebrow">TRADE ZONE PREMIUM · LEARNING COMMUNITY</div>
            <h1>Learn the fundamentals of stock market analysis.</h1>
            <p className="lead">
              Trade Zone Premium is a paid learning community focused on market
              education, chart-reading skills, technical analysis concepts,
              risk management, and structured market study.
            </p>

            <div className="education-points">
              <div className="education-point">
                <b>Market Education</b>
                <span>Build a structured understanding of markets, charts and common analysis concepts.</span>
              </div>
              <div className="education-point">
                <b>Analysis Skills</b>
                <span>Study technical-analysis frameworks, market structure and how to interpret charts.</span>
              </div>
              <div className="education-point">
                <b>Risk Awareness</b>
                <span>Learn position sizing, risk management and the importance of disciplined decision-making.</span>
              </div>
            </div>

            <CandleStrip />
          </div>

          <RegisterFlow />
        </section>

        <section className="learning-section">
          <div className="section-heading">
            <div className="eyebrow">WHAT MEMBERS STUDY</div>
            <h2>Practical financial-market learning</h2>
            <p>
              Membership provides access to educational material and a learning
              community designed to help members understand market concepts and
              analysis techniques.
            </p>
          </div>

          <div className="learning-grid">
            <article className="learning-card">
              <span className="learning-number">01</span>
              <h3>Technical Analysis</h3>
              <p>Learn chart patterns, trends, support and resistance, indicators and other technical-analysis concepts.</p>
            </article>

            <article className="learning-card">
              <span className="learning-number">02</span>
              <h3>Market Study</h3>
              <p>Learn how to organize market observations and study price action using a consistent framework.</p>
            </article>

            <article className="learning-card">
              <span className="learning-number">03</span>
              <h3>Risk Management</h3>
              <p>Understand risk/reward concepts, position sizing and why disciplined risk controls matter.</p>
            </article>

            <article className="learning-card">
              <span className="learning-number">04</span>
              <h3>Trading Psychology</h3>
              <p>Study common behavioural biases and practical habits that support disciplined market learning.</p>
            </article>

            <article className="learning-card">
              <span className="learning-number">05</span>
              <h3>Market Commentary</h3>
              <p>Review educational market commentary and analysis intended to demonstrate how market information can be studied.</p>
            </article>

            <article className="learning-card">
              <span className="learning-number">06</span>
              <h3>Learning Community</h3>
              <p>Access the private member community where educational material and learning discussions are shared.</p>
            </article>
          </div>
        </section>

        <section className="how-section">
          <div className="section-heading">
            <div className="eyebrow">HOW MEMBERSHIP WORKS</div>
            <h2>Simple access to the learning community</h2>
          </div>

          <ol className="steps">
            <li>
              <b>Choose a membership</b>
              <span>Select the learning-community plan that suits you.</span>
            </li>
            <li>
              <b>Verify your account</b>
              <span>Verify your email or WhatsApp number before payment.</span>
            </li>
            <li>
              <b>Pay securely</b>
              <span>Complete payment through the available payment methods.</span>
            </li>
            <li>
              <b>Access the community</b>
              <span>After successful payment, receive your member access link.</span>
            </li>
          </ol>
        </section>

        <section className="important-notice">
          <h2>Important information</h2>
          <p>
            Trade Zone Premium provides educational and informational material
            about financial markets. Educational content and market commentary
            should not be treated as a promise or guarantee of returns.
            Members are responsible for their own financial decisions and should
            consider their individual circumstances and risk tolerance.
          </p>
        </section>

        <footer className="site-footer">
          <div>
            <strong>Trade Zone Premium</strong>
            <span>Financial-market education and learning community.</span>
          </div>
          <div className="legal-name">
            <span>Legal Business Name</span>
            <strong>NATHVANI ROHAN VINODBHAI</strong>
          </div>
        </footer>
      </main>
    </>
  );
}
