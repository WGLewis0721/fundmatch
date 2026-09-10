import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { safeUrl } from "@/lib/demo-data";
import {
  packetFilename,
  packetMaterials,
  preparationChecks,
  readinessProgress,
  type FounderProfile,
  type PacketMaterial,
  type PreparationTask,
} from "@/lib/founder-readiness";
import "./founder-readiness.css";

export type PacketProps = {
  profile: FounderProfile;
  materials: PacketMaterial[];
  tasks: PreparationTask[];
  template: "vc" | "pe";
  demo?: boolean;
  generatedAt: string;
};

function value(value: number | null, money = false, suffix = "") {
  return value === null
    ? "Not provided"
    : `${money ? "$" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
}

/** Deliberately accepts only profile fields, chosen external links and checklist status. */
export function PacketDocument({
  profile: p,
  materials,
  tasks,
  template,
  demo = false,
  generatedAt,
}: PacketProps) {
  const progress = readinessProgress(tasks);
  const profileGaps = preparationChecks(p, [], 0).filter(
    (c) => !c.complete && c.destination === "profile",
  );
  const links = materials.filter((m) => safeUrl(m.url));
  return (
    <article className="fm-packet">
      <header className="fm-packet-header">
        <div className="fm-packet-brand">
          FundMatch<span>Great companies. Right investors.</span>
        </div>
        <p>
          {demo
            ? "FICTIONAL DEMO · NOT AN INVESTMENT OPPORTUNITY"
            : "FOUNDER-PREPARED COMPANY PROFILE"}
          <br />
          {generatedAt.slice(0, 10)} ·{" "}
          {template === "pe" ? "PE preparation" : "VC / angel fundraising"}
        </p>
      </header>
      <section className="fm-packet-intro">
        <span className="fm-packet-eyebrow">STANDARDIZED INVESTOR PACKET</span>
        <h1>{p.name}</h1>
        <p>{p.tagline || "One-line story not provided."}</p>
        <div className="fm-packet-tags">
          {[p.sector, p.stage, p.geography].filter(Boolean).map((t, i) => (
            <span key={`${t}-${i}`}>{t}</span>
          ))}
        </div>
      </section>
      <div className="fm-packet-metrics">
        {[
          ["Funding sought", value(p.ask, true)],
          ["Annual revenue", value(p.revenue, true)],
          ["YoY growth", value(p.growth, false, "%")],
          ["Team size", value(p.team)],
        ].map(([label, number]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{number}</strong>
            <small>{demo ? "Demo figure" : "Company-reported · not verified"}</small>
          </div>
        ))}
      </div>
      <section>
        <h2>01 / Company overview</h2>
        <p className="fm-packet-prose">{p.summary || "Company overview not provided."}</p>
        <dl>
          <div>
            <dt>Business model</dt>
            <dd>{p.businessModel || "Not provided"}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              {safeUrl(p.website) ? (
                <a href={p.website} target="_blank" rel="noopener noreferrer">
                  {p.website}
                </a>
              ) : (
                "Not provided"
              )}
            </dd>
          </div>
          {p.tags.length > 0 && (
            <div>
              <dt>Focus</dt>
              <dd>{p.tags.join(" · ")}</dd>
            </div>
          )}
        </dl>
      </section>
      <section>
        <h2>02 / Team, market & funding plan</h2>
        <p className="fm-packet-prose">
          {p.story ||
            "Team background, market evidence, use of funds and milestones have not been provided."}
        </p>
      </section>
      <section>
        <h2>03 / Preparation status</h2>
        <p>
          {progress.complete} of {progress.total}{" "}
          {template === "pe" ? "PE preparation" : "VC fundraising"} checklist items marked complete
          by the company.
        </p>
        {tasks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Preparation item</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Checklist not yet started.</p>
        )}
      </section>
      <section>
        <h2>04 / Materials selected for this packet</h2>
        {links.length ? (
          <ul>
            {links.map((m) => (
              <li key={m.id}>
                <a href={m.url} target="_blank" rel="noopener noreferrer">
                  {m.title}
                </a>
                <span>External link · access managed by the owner</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No external material links selected. Ask the founder for access to supporting materials.
          </p>
        )}
        <p className="fm-packet-caption">
          Private uploads are not attached or made accessible by this packet.
        </p>
      </section>
      <section>
        <h2>05 / Gaps & discussion points</h2>
        {profileGaps.length > 0 && (
          <ul>
            {profileGaps.map((c) => (
              <li key={c.id}>{c.label} — not yet supplied</li>
            ))}
          </ul>
        )}
        <ul>
          <li>Confirm the reporting period and evidence behind revenue and growth.</li>
          <li>
            Discuss customer demand, competitive alternatives and the team’s ability to deliver.
          </li>
          <li>
            Confirm how the funding will be used, the milestones it supports and material business
            risks.
          </li>
        </ul>
        <p className="fm-packet-caption">
          These are standard discussion prompts, not an AI assessment of this company.
        </p>
      </section>
      <footer>
        <strong>Sources & limitations</strong>
        <p>
          {demo
            ? "All company information is fictional demo data or local demo edits."
            : "Company profile and metrics supplied or confirmed by the company. FundMatch has not independently verified them."}{" "}
          Checklist statuses are self-reported. This packet excludes pending AI suggestions,
          internal notes, private document names and storage links. It does not verify diligence,
          recommend an investment or guarantee funding.
        </p>
      </footer>
    </article>
  );
}

// Standalone output has no scripts, remote fonts, tracking, storage URLs or app session.
const exportCss = `body{margin:0;background:#fff;color:#24272b;font:16px/1.6 Arial,sans-serif}.fm-packet{max-width:880px;margin:auto;padding:40px}h1{font-size:42px;line-height:1.12;margin:16px 0}h2{font-size:20px;margin:0 0 16px}section{padding:24px 0;border-bottom:1px solid #e5e4df}.fm-packet-header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #24272b;padding-bottom:20px}.fm-packet-brand{font-size:24px;font-weight:700}.fm-packet-brand span,.fm-packet-header p,.fm-packet-caption,small,footer{font-size:12px}.fm-packet-brand span{display:block;font-weight:400}.fm-packet-tags{display:flex;flex-wrap:wrap;gap:8px}.fm-packet-tags span{background:#c6efde;border-radius:20px;padding:4px 12px}.fm-packet-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:24px 0}.fm-packet-metrics strong{display:block;font-size:24px}.fm-packet-metrics span,.fm-packet-metrics small{display:block}.fm-packet-prose{white-space:pre-wrap}p,dd,a,li{overflow-wrap:anywhere}dl div{display:grid;grid-template-columns:150px 1fr;gap:16px}dd{margin:0}dt{font-weight:700}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:9px;border-bottom:1px solid #e5e4df}tr{break-inside:avoid}thead{display:table-header-group}li span{display:block;font-size:12px}a{color:#24272b}footer{padding-top:24px}@media print{@page{size:auto;margin:16mm}.fm-packet{padding:0;max-width:none}h1,h2{break-after:avoid}.fm-packet-metrics{break-inside:avoid}a[href]::after{content:' (' attr(href) ')';font-size:11px}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media(max-width:600px){.fm-packet{padding:20px}.fm-packet-header{display:block}dl div{display:block}}`;

export async function packetHtml(props: PacketProps) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const markup = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
        />
        <title>{`${props.profile.name} — FundMatch packet`}</title>
        <style>{exportCss}</style>
      </head>
      <body>
        <PacketDocument {...props} />
      </body>
    </html>,
  );
  return `<!doctype html>${markup}`;
}

export function InvestorPacket({
  profile,
  materials,
  tasks,
  template,
  demo = false,
  onEdit,
}: Omit<PacketProps, "generatedAt"> & { onEdit: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt] = useState(() => new Date().toISOString());
  const props: PacketProps = {
    profile,
    materials: packetMaterials(materials, selected),
    tasks,
    template,
    demo,
    generatedAt,
  };
  async function download() {
    setExporting(true);
    setError("");
    try {
      const html = await packetHtml(props);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = packetFilename(profile.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("The packet could not be downloaded. Try again or use Print / save PDF.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="fm-packet-workspace">
      <div className="demo-card fm-packet-controls">
        <div className="fm-builder-heading">
          <div>
            <h2>
              <FileText size={22} /> Your company, in one format.
            </h2>
            <p>
              Review what recipients will see. Exporting does not list your company or send
              anything.
            </p>
          </div>
          <button className="demo-link" onClick={onEdit}>
            Edit profile →
          </button>
        </div>
        {materials.some((m) => safeUrl(m.url)) && (
          <fieldset className="fm-packet-selection">
            <legend>Choose external links to include</legend>
            {materials
              .filter((m) => safeUrl(m.url))
              .map((m) => (
                <label key={m.id}>
                  <Checkbox
                    checked={selected.includes(m.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked === true ? [...current, m.id] : current.filter((id) => id !== m.id),
                      )
                    }
                  />
                  <span>
                    {m.title}
                    <small>{m.url}</small>
                  </span>
                </label>
              ))}
          </fieldset>
        )}
        <div className="demo-controls">
          <button className="fm-button" disabled={exporting} onClick={() => void download()}>
            <Download size={16} />
            {exporting ? "Preparing…" : "Download packet"}
          </button>
          <button className="fm-button secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print / save PDF
          </button>
        </div>
        <p className="demo-note">
          Download a standalone HTML file, or choose “Save as PDF” in your browser’s print dialog.
          Share only with the people you intend.
        </p>
        {error && (
          <p role="alert" className="fm-builder-error">
            {error}
          </p>
        )}
      </div>
      <PacketDocument {...props} />
    </div>
  );
}
