import { Card, CardBody, CardHeader } from '@heroui/react';
import { Ghost, Shield, Sparkles } from 'lucide-react';
import { Page } from '../../components/layout/Page';

export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="about">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-base-line bg-base-panel text-ink shadow-none">
            <CardHeader className="flex items-center gap-2.5 px-5 pt-5 pb-2">
              <Ghost size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Why Haunted Audit</h2>
            </CardHeader>
            <CardBody className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
              AI-built interfaces often look complete to a mouse user while trapping or blocking keyboard-only and voice-control users from finishing critical actions like payments.
            </CardBody>
          </Card>

          <Card className="border border-base-line bg-base-panel text-ink shadow-none">
            <CardHeader className="flex items-center gap-2.5 px-5 pt-5 pb-2">
              <Sparkles size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Who It Helps</h2>
            </CardHeader>
            <CardBody className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
              Accessibility QA engineers, frontend teams, and product reviewers who want reproducible keyboard/voice journey proof alongside auditable code fixes.
            </CardBody>
          </Card>

          <Card className="border border-base-line bg-base-panel text-ink shadow-none">
            <CardHeader className="flex items-center gap-2.5 px-5 pt-5 pb-2">
              <Shield size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Built with Kiro</h2>
            </CardHeader>
            <CardBody className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
              Driven by Kiro specifications, steering rules, MCP tools, and the save-time form label scanner.
            </CardBody>
          </Card>
        </div>
      </Page>
    </div>
  );
}
