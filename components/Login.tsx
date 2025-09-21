// DEPRECATED: 이 컴포넌트는 더 이상 사용되지 않습니다.
// LoginForm.tsx를 대신 사용하세요.

import React from 'react';
import { Alert, AlertDescription } from './ui/alert';

const Login: React.FC = () => {
  return (
    <div className="p-6">
      <Alert>
        <AlertDescription>
          이 컴포넌트는 더 이상 사용되지 않습니다. LoginForm 컴포넌트를 사용해주세요.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export { Login };
export default Login;