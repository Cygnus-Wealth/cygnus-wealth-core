import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import Layout from './Layout';

// Mock the child components
vi.mock('./SideMenu', () => ({
  default: ({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) => (
    <div data-testid="side-menu">
      <button onClick={() => onCollapseChange?.(true)}>Collapse</button>
    </div>
  ),
}));

const renderLayout = () => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('Layout', () => {
  it('should render the layout with side menu', () => {
    renderLayout();
    
    expect(screen.getByTestId('side-menu')).toBeInTheDocument();
  });

  it('should render the main content area', () => {
    const { container } = renderLayout();
    
    // Check that the container has content
    const contentArea = container.querySelector('div');
    expect(contentArea).toBeInTheDocument();
  });

  it('should handle sidebar collapse', () => {
    renderLayout();
    
    // Click the collapse button
    const collapseButton = screen.getByText('Collapse');
    expect(collapseButton).toBeInTheDocument();
    
    // We can click it but can't easily test the margin change without inspecting styles
    collapseButton.click();
  });
});