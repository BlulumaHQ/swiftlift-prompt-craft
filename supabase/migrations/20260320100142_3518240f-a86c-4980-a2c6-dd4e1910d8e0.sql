UPDATE demo_sites SET 
  desktop_screenshot_url = replace(desktop_screenshot_url, '.png', '.webp'),
  preview_image = replace(preview_image, '.png', '.webp')
WHERE id IN (
  '116c3f81-5f79-491b-a588-a2a9c524dff1',
  '0e37d3b2-5e59-481b-b376-2fc33ba363ee',
  '2e09ad45-b009-466d-8b52-e54911d5dc0b',
  '264670e5-662c-4ed8-b4cf-c1bf0c0335bd',
  'bc208150-e872-4a7a-84c6-4050637534fd',
  'c05dbd1e-4eb7-441c-94e9-0f3afe83df6c',
  '40d2e1f9-e952-4679-ae65-8c39623776dc',
  '00873814-423c-4be4-b2dc-d6376ac2b578',
  '44a34740-8dac-48a3-a251-9665cb2669ae',
  '074f728a-e3c6-4ca0-80b7-cbf837380b65'
);