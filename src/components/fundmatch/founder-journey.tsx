import { ArrowRight, Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  preparationChecks,
  readinessProgress,
  type FounderProfile,
  type PacketMaterial,
  type PreparationTask,
} from "@/lib/founder-readiness";
import "./founder-readiness.css";

export function FounderJourney({
  profile,
  materials,
  documentCount = 0,
  tasks,
  onOpen,
}: {
  profile: FounderProfile;
  materials: PacketMaterial[];
  documentCount?: number;
  tasks: PreparationTask[];
  onOpen: (view: "profile" | "materials" | "readiness" | "packet") => void;
}) {
  const checks = preparationChecks(profile, materials, documentCount);
  const complete = checks.filter((c) => c.complete).length;
  const progress = readinessProgress(tasks);
  return (
    <article className="demo-card fm-founder-journey">
      <div className="fm-builder-heading">
        <div>
          <span className="fm-kicker">YOUR FUNDRAISING WORKSPACE</span>
          <h2>Build once. Be ready to share.</h2>
          <p>
            {complete} of {checks.length} profile essentials supplied · {progress.complete} of{" "}
            {progress.total} checklist items complete.
          </p>
        </div>
        <button className="fm-button" onClick={() => onOpen("packet")}>
          Preview packet
          <ArrowRight size={16} />
        </button>
      </div>
      <Progress value={(complete / checks.length) * 100} aria-label="Profile essentials supplied" />
      <div className="fm-preparation-checks">
        {checks.map((c) => (
          <button key={c.id} onClick={() => onOpen(c.destination)}>
            {c.complete ? <Check size={18} /> : <Circle size={18} />}
            <span>
              {c.label}
              <small>{c.complete ? "Supplied" : "Missing — add details"}</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      <div className="fm-journey-footer">
        <p>These checks measure preparation, not investment quality or verified diligence.</p>
        <button className="demo-link" onClick={() => onOpen("readiness")}>
          Open full checklist →
        </button>
      </div>
    </article>
  );
}
