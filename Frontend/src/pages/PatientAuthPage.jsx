import RoleAuthCard from '../components/RoleAuthCard';

export default function PatientAuthPage() {
  return (
    <RoleAuthCard
      role="patient"
      eyebrow="Patients"
      title="Sign in to get your ticket"
      subtitle="Join a doctor’s queue and follow your place in line."
      registerTitle="Create your patient account"
      registerSubtitle="It takes under a minute. You’ll confirm your email once."
      registerEnabled
      redirectTo="/patient"
    />
  );
}
