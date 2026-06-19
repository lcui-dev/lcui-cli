#include "greeting.tsx.h"
#include "greeting.h"

typedef struct {
        greeting_react_t base;
        // Add additional states to your component here
        // ...
} greeting_t;

static void greeting_init(ui_widget_t *w)
{
        ui_widget_add_data(w, greeting_proto, sizeof(greeting_t));


        greeting_react_init(w);
        // Write the initialization code for your component here
        // such as state initialization, event binding, etc
        // ...

        greeting_update(w);
}

static greeting_t *greeting_get(ui_widget_t *w)
{
        return ui_widget_get_data(w, greeting_proto);
}

static void greeting_destroy(ui_widget_t *w)
{
        // Write code here to destroy the relevant resources of the component
        // ...


        greeting_react_destroy(w);
}

void greeting_update(ui_widget_t *w)
{
        greeting_react_update(w);
        // Write code here to update other content of your component
        // ...
}

ui_widget_t *ui_create_greeting(void)
{
        return ui_create_widget_with_prototype(greeting_proto);
}

void ui_register_greeting(void)
{
        greeting_init_prototype();
        greeting_proto->init = greeting_init;
        greeting_proto->destroy = greeting_destroy;
}
