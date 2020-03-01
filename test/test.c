#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include "locales.c"
#include <LCUI/util/charset.h>

wchar_t *str2wcs(const char *str)
{
	wchar_t *wcs;
	size_t len;

	len = LCUI_DecodeString(NULL, str, 0, ENCODING_ANSI) + 1;
	wcs = malloc(sizeof(wchar_t) * len);
	len = LCUI_DecodeString(wcs, str, len, ENCODING_ANSI);
	wcs[len] = 0;
	return wcs;
}

int main(int argc, char **argv)
{
	i18n_t *i18n;
	wchar_t *wcs;
	const wchar_t *text;

	if (argc != 3) {
		printf("invalid arguments\n");
		return -1;
	}
	wcs = str2wcs(argv[1]);
	i18n = i18n_create(wcs);
	free(wcs);
	if (!i18n) {
		printf("cannot found locale: %s\n", argv[1]);
		return -2;
	}
	wcs = str2wcs(argv[2]);
	text = i18n_get_text(i18n, wcs);
	free(wcs);
	if (!text) {
		printf("cannot found text by key: %s\n", argv[2]);
		return -3;
	}
	setlocale(LC_ALL, "");
	printf("%ls\n", text);
	return 0;
}
