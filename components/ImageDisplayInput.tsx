import React from 'react';
import { Card, Stack, Text, Flex, Box, Badge } from '@sanity/ui';
import { useFormValue, type ObjectInputProps } from 'sanity';

const PROJECT_ID = 'arbp7h2s';
const DATASET = 'production';

// Asset refs look like: image-<hash>-<width>x<height>-<ext>
const REF_PATTERN = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/;

interface ParsedRef {
  hash: string;
  width: number;
  height: number;
  ext: string;
}

function parseRef(ref?: string): ParsedRef | null {
  const match = ref ? REF_PATTERN.exec(ref) : null;

  if (!match) return null;

  return {
    hash: match[1],
    width: Number(match[2]),
    height: Number(match[3]),
    ext: match[4],
  };
}

function baseUrl(parsed: ParsedRef): string {
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${parsed.hash}-${parsed.width}x${parsed.height}.${parsed.ext}`;
}

function normalizeBg(bg?: string): string {
  const value = (bg || 'ffffff').trim().replace(/^#/, '');

  return /^[0-9a-fA-F]{3,8}$/.test(value) ? value : 'ffffff';
}

// Mirrors lib/product-image.ts in gsweb so the preview matches the storefront
function previewUrl(
  parsed: ParsedRef,
  size: number,
  fit?: string,
  bg?: string,
  pad?: number,
): string {
  if (fit !== 'contain') {
    return `${baseUrl(parsed)}?w=${size}&h=${size}`;
  }

  const scaledPad = Math.round((Math.max(0, Math.min(pad ?? 0, 400)) * size) / 800);
  const padParam = scaledPad > 0 ? `&pad=${scaledPad}` : '';

  return `${baseUrl(parsed)}?w=${size}&h=${size}&fit=fill&bg=${normalizeBg(bg)}${padParam}`;
}

/**
 * Live preview for the Image Sizing field.
 *
 * Storefront surfaces frame every product photo in a square with object-cover,
 * so a non-square photo gets cropped. This shows the current crop beside the
 * padded result, at the same size the store grid renders.
 */
export function ImageDisplayInput(props: ObjectInputProps) {
  const mainImage = useFormValue(['mainImage']) as any;
  const value = (props.value || {}) as {
    fit?: string;
    background?: string;
    pad?: number;
  };

  const parsed = parseRef(mainImage?.asset?._ref);

  const ratio = parsed ? parsed.width / parsed.height : 1;
  const orientation = !parsed
    ? 'unknown'
    : ratio > 1.05
      ? 'landscape'
      : ratio < 0.95
        ? 'portrait'
        : 'square';

  return (
    <Stack space={4}>
      {parsed ? (
        <Card padding={4} radius={2} shadow={1} style={{ border: '2px solid #4f46e5' }}>
          <Stack space={4}>
            <Stack space={2}>
              <Text size={1} weight="bold" style={{ color: '#4f46e5' }}>
                SQUARE PREVIEW
              </Text>
              <Flex align="center" gap={2}>
                <Text size={1} muted>
                  Source is {parsed.width}×{parsed.height}
                </Text>
                <Badge tone={orientation === 'square' ? 'positive' : 'caution'}>
                  {orientation}
                </Badge>
              </Flex>
              {orientation !== 'square' && (
                <Text size={1} muted>
                  The store frames product photos as squares. A {orientation}{' '}
                  photo gets cropped unless you switch to “Fit whole image”.
                </Text>
              )}
            </Stack>

            <Flex gap={4} wrap="wrap">
              <Box>
                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    Crop to fill
                  </Text>
                  <div
                    style={{
                      width: 190,
                      height: 190,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '1px solid #d1d5db',
                      background: '#f3f4f6',
                    }}
                  >
                    <img
                      alt="Cropped preview"
                      src={previewUrl(parsed, 400, 'cover')}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <Text size={0} muted>
                    {value.fit !== 'contain' ? 'Currently active' : 'Not active'}
                  </Text>
                </Stack>
              </Box>

              <Box>
                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    Fit whole image
                  </Text>
                  <div
                    style={{
                      width: 190,
                      height: 190,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '1px solid #d1d5db',
                      background: '#f3f4f6',
                    }}
                  >
                    <img
                      alt="Padded preview"
                      src={previewUrl(
                        parsed,
                        400,
                        'contain',
                        value.background,
                        value.pad,
                      )}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <Text size={0} muted>
                    {value.fit === 'contain' ? 'Currently active' : 'Not active'}
                  </Text>
                </Stack>
              </Box>
            </Flex>

            <Text size={0} muted>
              Padding shrinks the product inside the square. It scales with the
              rendered size, so thumbnails and full-size images stay consistent.
            </Text>
          </Stack>
        </Card>
      ) : (
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>Set a Main Image to preview sizing</Text>
        </Card>
      )}

      {props.renderDefault(props)}
    </Stack>
  );
}
