// Manual Jest mock for react-router-dom used in unit tests
// Provides minimal APIs required by components under test
export const useNavigate = () => jest.fn();
export const useLocation = () => ({ pathname: '/', state: undefined });
export const Link = (_props: any) => null as any;
export const MemoryRouter = (props: any) => (props && props.children) || null;
export const Navigate = (_props: any) => null as any;
