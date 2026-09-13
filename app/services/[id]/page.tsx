import { PublicShell } from "@/components/public-shell";
import { ServiceDetailPage } from "@/components/service-detail-page";

export default async function ServiceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <PublicShell>
            <ServiceDetailPage id={id} />
        </PublicShell>
    );
}
