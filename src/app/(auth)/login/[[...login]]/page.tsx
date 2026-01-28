import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your TaxBinder account</p>
      </div>
      <SignIn
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
