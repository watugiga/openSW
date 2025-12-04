export default async function main() 
{
    const main_menu_screen = document.querySelector('#main-menu-screen')
    const credit_screen = document.querySelector('#credit-screen')

    let current_screen = main_menu_screen
    let currentIndex = 0;
    const menuitems = document.querySelectorAll(".menu-item");
    const max_itemIndex = menuitems.length
    console.log('max menu index : &{max_itemIndex}')
    
    console.log(menuitems)

    menuitems[currentIndex].classList.add("select")
            window.addEventListener("keydown", (e) => {
            //console.log(e)
            if(current_screen == main_menu_screen){
            if(e.key == "ArrowUp") 
            {
                menuitems[currentIndex].classList.remove('select')
                console.log('up')
                currentIndex--
                if(currentIndex < 0)
                {
                     currentIndex=max_itemIndex-1
                }
            }   
            else if(e.key == "ArrowDown")
            {
                menuitems[currentIndex].classList.remove('select')
                console.log('down')
                currentIndex++
              currentIndex %= max_itemIndex
            }    
            else if(e.key == "Enter")
            {
                const _select_menuItem = menuitems[currentIndex]
                console.log(`select index : ${currentIndex}`)
                console.log(_select_menuItem)
                const _action = _select_menuItem.dataset.action
                console.log(_action)

                if(_action == 'credit')
                {
                    current_screen = credit_screen
                    main_menu_screen.classList.add('hide')
                    credit_screen.classList.remove('hide')
                }
            }
        }
        else if(current_screen == 'credit')
        {
            if(e.key == "Enter")
            {
                if(current_screen = credit_screen)
                {
                    main_menu_screen.classList.remove('hide')
                    credit_screen.classList.add('hide')
                }
            }
        }
            menuitems[currentIndex].classList.add("select")

            console.log(currentIndex)
            })
}
        
