import React from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";

// Mock session data
export const mockSessionData: {
  user: {
    id: string;
    email: string;
    name: string;
    image: string;
    username: string;
  };
  expires: string;
} = {
  user: {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    image: "https://example.com/avatar.jpg",
    username: "testuser",
  },
  expires: "2024-12-31T23:59:59.999Z",
};

// Mock providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode;
  session?: any;
  queryClient?: QueryClient;
}

const AllTheProviders = ({
  children,
  session = null,
  queryClient: customQueryClient,
}: AllTheProvidersProps) => {
  const queryClient =
    customQueryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    });

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: any;
  queryClient?: QueryClient;
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const { session, queryClient, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session} queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Render with authenticated session
export const renderWithAuth = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  return customRender(ui, {
    session: mockSessionData,
    ...options,
  });
};

// Render without authentication
export const renderWithoutAuth = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  return customRender(ui, {
    session: null,
    ...options,
  });
};

// Create a test query client
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: process.env.NODE_ENV === "test" ? () => {} : console.error,
    },
  });

// Mock API response helpers
export const mockApiResponse = <T,>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? "OK" : "Error",
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

// Mock fetch for API testing
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve(mockApiResponse(response, status))
  ) as jest.MockedFunction<typeof fetch>;
};

// Restore fetch after mocking
export const restoreFetch = () => {
  if (jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore();
  }
};

// Wait for async operations to complete
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Mock intersection observer for testing components that use it
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

// Mock ResizeObserver for testing components that use it
export const mockResizeObserver = () => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
  return localStorageMock;
};

// Mock window.location
export const mockLocation = (url: string) => {
  delete (window as any).location;
  window.location = new URL(url) as any;
};

// Mock console methods to avoid noise in tests
export const mockConsole = () => {
  const originalConsole = { ...console };
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();

  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    },
  };
};

// Test data factories
export const createMockAlbum = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: "album-123",
  title: "Test Album",
  description: "Test Description",
  country: "United States",
  city: "San Francisco",
  latitude: 37.7749,
  longitude: -122.4194,
  privacy: "PUBLIC",
  tags: ["adventure", "travel"],
  userId: "user-123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  date: new Date("2024-01-01"),
  viewCount: 0,
  shareCount: 0,
  photos: [],
  photosCount: 0,
  favoritesCount: 0,
  coverPhotoUrl: null,
  user: {
    id: "user-123",
    name: "Test User",
    username: "testuser",
    image: null,
  },
  ...overrides,
});

export const createMockUser = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  username: "testuser",
  image: "https://example.com/avatar.jpg",
  bio: "Test bio",
  location: "San Francisco",
  website: "https://example.com",
  isPublic: true,
  createdAt: new Date("2024-01-01"),
  totalCountriesVisited: 5,
  totalAlbumsCount: 10,
  totalPhotosCount: 50,
  currentStreak: 3,
  longestStreak: 7,
  ...overrides,
});

export const createMockComment = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: "comment-123",
  content: "Test comment",
  userId: "user-123",
  targetType: "Album",
  targetId: "album-123",
  createdAt: new Date("2024-01-01"),
  user: createMockUser(),
  ...overrides,
});

// Custom matchers for common assertions
export const customMatchers = {
  toBeInTheDocument: expect.objectContaining({
    pass: expect.any(Boolean),
    message: expect.any(Function),
  }),
};

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Override the default render
export { customRender as render };
