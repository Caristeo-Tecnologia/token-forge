import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";

export default function Updates() {
  return (
    <PageContainer>
      <PageHeader title="Updates Feed" subtitle="Periodic updates and execution progress per product." />
      <EmptyState title="Updates feed coming soon" description="Publish progress reports per contract, with public visibility control." />
    </PageContainer>
  );
}
