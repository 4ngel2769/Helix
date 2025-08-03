import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';
import { UserProvider } from '../contexts/UserContext';

describe('Navbar', () => {
  it('renders the navbar with the title', () => {
    render(
      <UserProvider>
        <Navbar />
      </UserProvider>
    );

    const titleElement = screen.getByText(/Helix Bot/i);
    expect(titleElement).toBeInTheDocument();
  });
});
