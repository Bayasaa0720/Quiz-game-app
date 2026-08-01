import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './Card.jsx';

describe('Card', () => {
    it('renders a plain div with no keyboard role when there is no onClick', () => {
        render(<Card>Хүлээгдэж буй агуулга</Card>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('becomes a keyboard-operable button when onClick is provided', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Дав 1</Card>);

        const card = screen.getByRole('button');
        expect(card).toHaveAttribute('tabindex', '0');

        card.focus();
        await userEvent.keyboard('{Enter}');
        expect(onClick).toHaveBeenCalledTimes(1);

        await userEvent.keyboard(' ');
        expect(onClick).toHaveBeenCalledTimes(2);
    });
});
