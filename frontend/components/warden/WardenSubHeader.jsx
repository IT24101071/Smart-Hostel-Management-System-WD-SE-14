import { useRouter } from "expo-router";
import AdminSubHeader from "../admin/AdminSubHeader";

export default function WardenSubHeader({ title, subtitle, onBack }) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/warden");
  };

  return <AdminSubHeader title={title} subtitle={subtitle} onBack={handleBack} />;
}
