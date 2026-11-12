import { getWelcomeHtml } from './welcome.html';

describe('getWelcomeHtml', () => {
  it('should return HTML containing bg-[#006a4e] and the welcome message', () => {
    const html = getWelcomeHtml();
    expect(html).toContain('bg-[#006a4e]');
    expect(html).toContain('#006a4e');
    expect(html.toLowerCase()).toContain('welcome to shanti_sangho_server');
    expect(html).toContain('<!DOCTYPE html>');
  });
});
