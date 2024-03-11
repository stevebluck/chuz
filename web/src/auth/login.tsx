import { LoginForm } from "./login-form";

export const Login = ({ data }: { data: any }) => (
  <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
    <div className="flex flex-col space-y-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
      <p className="text-sm text-muted-foreground">Lets get back to learning!</p>
    </div>
    <div>
      <div>
        <h6>Action data:</h6>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
      <LoginForm />
    </div>
  </div>
);
