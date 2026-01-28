import { SignUp } from '@clerk/nextjs';

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-muted-foreground">Get started with TaxBinder</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border rounded-lg',
          },
        }}
      />
    </div>
  );
}
