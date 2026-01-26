import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button, { IconButton, Chip } from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-oaxaca-pink');
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-100');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-2');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6');
  });

  it('renders full width when prop is set', () => {
    render(<Button fullWidth>Full Width</Button>);

    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders left icon', () => {
    const LeftIcon = <span data-testid="left-icon">←</span>;
    render(<Button leftIcon={LeftIcon}>With Icon</Button>);

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    const RightIcon = <span data-testid="right-icon">→</span>;
    render(<Button rightIcon={RightIcon}>With Icon</Button>);

    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('does not render right icon when loading', () => {
    const RightIcon = <span data-testid="right-icon">→</span>;
    render(<Button loading rightIcon={RightIcon}>Loading</Button>);

    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('renders icon button with aria-label', () => {
    const icon = <span data-testid="icon">✓</span>;
    render(<IconButton icon={icon} aria-label="Check" />);

    const button = screen.getByRole('button', { name: /check/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    const icon = <span>✓</span>;
    render(<IconButton icon={icon} loading aria-label="Loading" />);

    const button = screen.getByRole('button');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    const icon = <span>✓</span>;

    render(<IconButton icon={icon} onClick={handleClick} aria-label="Click" />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Chip', () => {
  it('renders chip with label', () => {
    render(<Chip label="Test Chip" />);

    expect(screen.getByText('Test Chip')).toBeInTheDocument();
  });

  it('applies different colors', () => {
    const { container, rerender } = render(<Chip label="Primary" color="primary" />);
    expect(container.firstChild).toHaveClass('bg-oaxaca-pink/10');

    rerender(<Chip label="Success" color="success" />);
    expect(container.firstChild).toHaveClass('bg-green-100');

    rerender(<Chip label="Error" color="error" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });

  it('renders as outlined variant', () => {
    const { container } = render(<Chip label="Outlined" variant="outlined" />);

    expect(container.firstChild).toHaveClass('border');
  });

  it('shows selected state', () => {
    const { container } = render(<Chip label="Selected" selected />);

    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('calls onClick when clickable', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Chip label="Clickable" onClick={handleClick} />);

    await user.click(screen.getByText('Clickable'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders delete button and calls onDelete', async () => {
    const handleDelete = vi.fn();
    const user = userEvent.setup();

    render(<Chip label="Deletable" onDelete={handleDelete} />);

    const deleteButton = screen.getByLabelText('Eliminar');
    expect(deleteButton).toBeInTheDocument();

    await user.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    const icon = <span data-testid="chip-icon">★</span>;
    render(<Chip label="With Icon" icon={icon} />);

    expect(screen.getByTestId('chip-icon')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { container, rerender } = render(<Chip label="Small" size="sm" />);
    expect(container.firstChild).toHaveClass('text-xs');

    rerender(<Chip label="Medium" size="md" />);
    expect(container.firstChild).toHaveClass('text-sm');
  });
});
