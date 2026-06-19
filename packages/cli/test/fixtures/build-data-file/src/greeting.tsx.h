/** This file is generated from greeting.tsx */
#include <ui.h>

// UTF-8 encoded string from: Hello%20from%20Greeting
static const unsigned char widget_text_0[] = {0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x66, 0x72, 0x6f, 0x6d, 0x20, 0x47, 0x72, 0x65, 0x65, 0x74, 0x69, 0x6e, 0x67, 0};

typedef struct greeting_react_state {
        char empty;
} greeting_react_state_t;

typedef struct greeting_react {
        greeting_react_state_t state;
} greeting_react_t;

static ui_widget_prototype_t *greeting_proto;

static void greeting_init_prototype(void)
{
        greeting_proto = ui_create_widget_prototype("greeting", NULL);
}

static void greeting_load_template(ui_widget_t *parent)
{
        ui_widget_set_text(parent, (const char*)widget_text_0);
}

static void greeting_react_update(ui_widget_t *w)
{
        greeting_react_t *_that = ui_widget_get_data(w, greeting_proto);
}

static void greeting_react_init(ui_widget_t *w)
{
        greeting_react_t *_that = ui_widget_get_data(w, greeting_proto);
        greeting_load_template(w);
}

static void greeting_react_destroy(ui_widget_t *w)
{
}

void ui_load_greeting_resources(void)
{
}
