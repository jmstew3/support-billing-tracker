import { http, HttpResponse } from 'msw'

// MSW handlers for mocking API responses in tests
export const handlers = [
  // Mock support tickets endpoint
  http.get('*/rest/supportTickets', () => {
    return HttpResponse.json({
      edges: []
    })
  }),

  // Mock projects endpoint
  http.get('*/rest/projects', () => {
    return HttpResponse.json({
      edges: []
    })
  }),

  // Mock website properties (hosting) endpoint
  http.get('*/rest/websiteProperties', () => {
    return HttpResponse.json({
      edges: []
    })
  })
]
