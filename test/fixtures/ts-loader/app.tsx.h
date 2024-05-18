/** This file is generated from app.tsx */
#include <ui.h>

// UTF-8 encoded string from: Button
static const unsigned char widget_text_0[] = {0x42, 0x75, 0x74, 0x74, 0x6f, 0x6e, 0};
// UTF-8 encoded string from: Hello
static const unsigned char widget_text_1[] = {0x48, 0x65, 0x6c, 0x6c, 0x6f, 0};

typedef struct App_react_state {
        char empty;
} App_react_state_t;

typedef struct App_react {
        App_react_state_t state;
} App_react_t;

static ui_widget_prototype_t *MyButton_proto;

static void MyButton_init_prototype(void)
{
        MyButton_proto = ui_create_widget_prototype("MyButton", NULL);
}

static void MyButton_load_template(ui_widget_t *parent)
{
        ui_widget_t *w[2];

        ui_widget_set_text(parent, (const char*)widget_text_0);
}

static void App_react_update(ui_widget_t *w)
{
        App_react_t *_that = ui_widget_get_data(w, App_proto);
}

static void App_react_init(ui_widget_t *w)
{
        App_react_t *_that = ui_widget_get_data(w, App_proto);
        App_load_template(w);
}

static void App_react_destroy(ui_widget_t *w)
{
}

typedef struct App_react_state {
        char empty;
} App_react_state_t;

typedef struct App_react {
        App_react_state_t state;
} App_react_t;

static ui_widget_prototype_t *App_proto;

static void App_init_prototype(void)
{
        App_proto = ui_create_widget_prototype("App", NULL);
}

static void App_load_template(ui_widget_t *parent)
{
        ui_widget_t *w[2];

        w[0] = ui_create_widget("text");
        ui_widget_set_text(w[0], (const char*)widget_text_1);
        w[1] = ui_create_widget("MyButton");
        ui_widget_append(parent, w[0]);
        ui_widget_append(parent, w[1]);
}

static void App_react_update(ui_widget_t *w)
{
        App_react_t *_that = ui_widget_get_data(w, App_proto);
}

static void App_react_init(ui_widget_t *w)
{
        App_react_t *_that = ui_widget_get_data(w, App_proto);
        App_load_template(w);
}

static void App_react_destroy(ui_widget_t *w)
{
}

void ui_load_app_resources(void)
{
}
