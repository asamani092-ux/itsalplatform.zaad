import EmployeeProfileForm from "@/components/employee/EmployeeProfileForm";

export default function EmployeeProfilePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary">الملف الشخصي</h2>
        <p className="text-sm text-brand-gray">تعديل البيانات وكلمة المرور</p>
      </div>
      <EmployeeProfileForm />
    </div>
  );
}
