import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";

export default function Documents() {
  return (
    <PageContainer>
      <PageHeader title="Documents" subtitle="Environmental licenses, concession agreements, contracts, reports." />
      <EmptyState title="Document storage coming soon" description="Upload, version, and publish compliance documents per project or product." />
    </PageContainer>
  );
}
