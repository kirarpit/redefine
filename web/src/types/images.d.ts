declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  import * as React from 'react';
  
  // This allows importing SVGs both as strings and as React components
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  
  // Default export is path as string for <img src={} /> usage
  const content: string;
  export { ReactComponent };
  export default content;
} 