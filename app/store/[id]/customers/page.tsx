import { CustomersView } from "@/components/store/CustomersView";

export default function StoreCustomersPage({ params }: { params: { id: string } }) {
  return <CustomersView businessId={params.id} />;
}